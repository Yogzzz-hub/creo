import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { PasswordRecoveryModal } from "../../components/auth/PasswordRecoveryModal";
import {
  User,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Instagram,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  KeyRound,
  ShieldAlert,
  X,
  Check,
  Loader2,
  Radio,
  Lock,
} from "lucide-react";
import {
  disconnectInstagram,
  fetchInstagramStatus,
  startMetaConnect,
  verifyInstagram,
} from "../../lib/instagram-oauth";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

export function PortalAccountPage({ defaultTab = "settings" }: { defaultTab?: string }) {
  const { user, patchUser, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const gate = useOnboardingGate();
  const isLocked = gate.isClient && !gate.isComplete;

  // Read tab from query params
  const rawTab = params.get("tab") || defaultTab;

  // Normalized tab identifier: only Account, Integrations, and Security
  const activeTab = (() => {
    if (["integrations", "instagram", "social"].includes(rawTab)) return "integrations";
    if (["security", "password"].includes(rawTab)) return "security";
    return "account"; // default for "settings", "business", "account", etc.
  })();

  const query = useQuery({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request<any>("/api/v1/portal/profile"),
    enabled: !!user?.id && !isLocked,
  });

  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    instagram: "",
  });

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Instagram Hub state
  const [isConnectingIg, setIsConnectingIg] = useState(false);
  const [isDisconnectingIg, setIsDisconnectingIg] = useState(false);
  const [isVerifyingIg, setIsVerifyingIg] = useState(false);
  const [confirmDisconnectModal, setConfirmDisconnectModal] = useState(false);

  // 2FA state
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  // Keyboard escape listener for popup modal
  useEffect(() => {
    if (!message && !errorMessage && !confirmDisconnectModal) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMessage("");
        setErrorMessage("");
        setConfirmDisconnectModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", onKey);
    };
  }, [message, errorMessage, confirmDisconnectModal]);

  // Sync profile data into form state
  useEffect(() => {
    if (query.data) {
      const p = query.data;
      setForm({
        instagram: p.instagram_username || "",
        name: p.full_name || "",
        company: p.company_name || "",
        phone: p.phone || "",
      });
    }
  }, [query.data]);

  // Save General Profile
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    const newFullName = form.name.trim();
    const newCompany = form.company.trim();
    const newPhone = form.phone.trim();

    // 1. Instantly patch auth user so sidebar, header, and home greeting update LIVE (0ms latency)
    patchUser({
      full_name: newFullName,
      company_name: newCompany,
    });

    // 2. Instantly update profile query cache so settings badge updates LIVE
    queryClient.setQueriesData({ queryKey: ["portal-profile"] }, (old: any) =>
      old ? { ...old, full_name: newFullName, company_name: newCompany, phone: newPhone } : old
    );
    queryClient.setQueriesData({ queryKey: ["portal-dashboard"] }, (old: any) =>
      old
        ? {
            ...old,
            full_name: newFullName,
            company_name: newCompany,
            company: { ...(old?.company || {}), name: newCompany },
          }
        : old
    );

    try {
      await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: newFullName,
          company_name: newCompany,
          phone: newPhone,
        }),
      });

      // 3. Revalidate and synchronize persistent auth profile
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["portal-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] }),
        queryClient.refetchQueries({ queryKey: ["portal-profile"] }),
        queryClient.refetchQueries({ queryKey: ["portal-dashboard"] }),
        query.refetch(),
        refresh(),
      ]);

      setMessage("Your account details have been saved successfully.");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Changes could not be saved.");
      await query.refetch();
    } finally {
      setBusy(false);
    }
  }

  // Instagram / Meta: real OAuth (Facebook Login). The authoritative state is the
  // backend connection status, never a typed handle.
  async function handleConnectInstagram(provider: "facebook" | "instagram" = "facebook") {
    if (!user?.id) return;
    setIsConnectingIg(true);
    setErrorMessage("");
    try {
      await startMetaConnect(user.id, "/portal/account?tab=integrations", undefined, provider);
      // The browser is now navigating to Meta; keep the button busy until it unloads.
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not start the Meta connection.");
      setIsConnectingIg(false);
    }
  }

  async function refreshInstagramViews() {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["instagram-connection"] }),
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["publishing"] }),
    ]);
  }

  async function handleVerifyInstagram() {
    setIsVerifyingIg(true);
    setErrorMessage("");
    try {
      const data = await verifyInstagram();
      await refreshInstagramViews();
      if (data.error) setErrorMessage(data.error);
      else setMessage("Instagram connection verified.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not verify the Instagram connection.");
    } finally {
      setIsVerifyingIg(false);
    }
  }

  async function handleDisconnectInstagram() {
    setIsDisconnectingIg(true);
    setErrorMessage("");
    try {
      const data = await disconnectInstagram();
      await refreshInstagramViews();
      setConfirmDisconnectModal(false);
      setMessage(
        data.provider_revoked
          ? "Instagram disconnected. Future publishing is paused."
          : "Disconnected from Creo. Meta could not confirm revocation; also remove Creo under Facebook Business Integrations.",
      );
    } catch (err: any) {
      setConfirmDisconnectModal(false);
      setErrorMessage(err?.message || "Failed to disconnect Instagram account.");
      await refreshInstagramViews();
    } finally {
      setIsDisconnectingIg(false);
    }
  }

  // Toggle Two-Factor Authentication
  async function handleToggle2FA() {
    setTwoFaBusy(true);
    const nextState = !query.data?.two_fa_enabled;
    try {
      await request("/api/v1/portal/profile/2fa", {
        method: "POST",
        body: JSON.stringify({ enabled: nextState }),
      });
      await queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      await query.refetch();
      setMessage(nextState ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update two-factor authentication.");
    } finally {
      setTwoFaBusy(false);
    }
  }

  const igQuery = useQuery({
    queryKey: ["instagram-connection", user?.id],
    queryFn: fetchInstagramStatus,
    enabled: !!user?.id && !isLocked && user?.role === "client",
    staleTime: 0,
  });
  const ig = igQuery.data;
  const isIgConnected = Boolean(ig?.connected);
  const igNeedsReconnect = ig?.status === "reconnect_required";
  const currentIgHandle = (ig?.username || "").replace(/^@/, "");

  return (
    <main className="text-white space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Tab Navigation & User Preview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#2A3446]/60">
        <nav aria-label="Account Settings Tabs" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setParams({ tab: "account" })}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "account"
                ? "bg-[#BCCCE6] text-[#0B111C] shadow-lg shadow-[#BCCCE6]/10 scale-[1.02]"
                : "bg-[#161F2D] text-[#97A0B3] hover:text-white hover:bg-[#1E293B] border border-[#2A3446]"
            }`}
          >
            <User className="size-4" />
            <span>Profile & Company</span>
            {isLocked && <Lock className="size-3 text-[#97A0B3] ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setParams({ tab: "integrations" })}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer relative ${
              activeTab === "integrations"
                ? "bg-[#BCCCE6] text-[#0B111C] shadow-lg shadow-[#BCCCE6]/10 scale-[1.02]"
                : "bg-[#161F2D] text-[#97A0B3] hover:text-white hover:bg-[#1E293B] border border-[#2A3446]"
            }`}
          >
            <Instagram className="size-4" />
            <span>Instagram & Integrations</span>
            {isLocked ? (
              <Lock className="size-3 text-[#97A0B3] ml-0.5" />
            ) : isIgConnected ? (
              <span
                className={`size-2 rounded-full ml-0.5 ${
                  activeTab === "integrations" ? "bg-emerald-600" : "bg-emerald-400 animate-pulse"
                }`}
              />
            ) : (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ml-0.5 ${
                  activeTab === "integrations"
                    ? "bg-[#0B111C]/20 text-[#0B111C]"
                    : "bg-[#0B111C] text-[#97A0B3] border border-[#2A3446]"
                }`}
              >
                Connect
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setParams({ tab: "security" })}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "security"
                ? "bg-[#BCCCE6] text-[#0B111C] shadow-lg shadow-[#BCCCE6]/10 scale-[1.02]"
                : "bg-[#161F2D] text-[#97A0B3] hover:text-white hover:bg-[#1E293B] border border-[#2A3446]"
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>Security & Password</span>
            {isLocked && <Lock className="size-3 text-[#97A0B3] ml-0.5" />}
          </button>
        </nav>

        {/* User preview badge */}
        {(query.data || user) && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#161F2D] border border-[#2A3446] shrink-0">
            <div className="size-8 rounded-full bg-gradient-to-tr from-[#7FA0D6] to-[#BCCCE6] text-[#0B111C] font-black text-xs flex items-center justify-center uppercase shadow-sm">
              {(query.data?.full_name || user?.full_name || user?.email || "U").slice(0, 2)}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none truncate max-w-[140px]">
                {query.data?.full_name || user?.full_name || "Client Member"}
              </p>
              <p className="text-[10px] text-[#97A0B3] truncate max-w-[140px] mt-0.5">
                {query.data?.email || user?.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {!isLocked && query.isPending && (
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-12 text-center space-y-4">
          <Loader2 className="size-8 text-[#BCCCE6] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#97A0B3]">Loading your account settings…</p>
        </div>
      )}
      {/* Error state */}
      {!isLocked && query.isError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="size-8 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-200">{query.error.message}</p>
          <button
            onClick={() => void query.refetch()}
            className="px-5 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Locked state for client before onboarding completion */}
      {isLocked ? (
        <SubscriptionLockedState
          title={
            activeTab === "integrations"
              ? "Instagram Integration Locked"
              : activeTab === "security"
              ? "Security Settings Locked"
              : "Profile & Company Locked"
          }
          description={
            activeTab === "integrations"
              ? "Complete setup to connect your Instagram account for automated publishing."
              : activeTab === "security"
              ? "Complete setup to manage your workspace credentials."
              : "Complete setup to manage your personal and company information."
          }
        />
      ) : (
        <>

      {/* TAB 1: INSTAGRAM & INTEGRATIONS */}
      {query.data && activeTab === "integrations" && (
        <section className="space-y-8 animate-in fade-in duration-300">
          <div className="rounded-3xl border border-[#2A3446] bg-[#161F2D] p-6 space-y-3">
            <h3 className="text-lg font-bold text-white">Direct Instagram connection</h3>
            <p className="text-xs text-[#97A0B3]">
              Connect a Business or Creator account without a Facebook Page. Sign in on Instagram;
              your password is never shared with Creo. This replaces the workspace's existing connection.
            </p>
            <button type="button"
              disabled={isConnectingIg || igQuery.isPending}
              onClick={() => void handleConnectInstagram("instagram")}
              className="min-h-11 px-6 py-3 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold text-xs hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isConnectingIg ? "Opening authorization..." : "Connect Instagram directly"}
            </button>
            {ig && !ig.instagram_login_configured && (
              <p className="text-xs text-amber-300">Your agency needs to finish direct Instagram setup.</p>
            )}
          </div>
          {/* STATE 1: ALREADY CONNECTED - SHOW RICH CUSTOMER INSTAGRAM PROFILE */}
          {isIgConnected ? (
            <div className="space-y-6">
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-8 space-y-8">
                {/* Customer Profile Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#2A3446]">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="p-1 rounded-full bg-[#0B111C] border border-[#2A3446]">
                      <div className="size-16 sm:size-20 rounded-full bg-[#161F2D] flex items-center justify-center text-white">
                        <Instagram className="size-8 sm:size-10 text-[#BCCCE6]" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          @{currentIgHandle}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Active Meta Sync
                        </span>
                      </div>
                      <p className="text-xs text-[#97A0B3]">
                        {form.company || query.data.company_name || query.data.full_name || "Client Brand"} · Business / Creator Account
                      </p>
                      <p className="text-[11px] text-[#7FA0D6] flex items-center gap-1">
                        <Radio className="size-3 animate-pulse text-emerald-400" />
                        Ready for 9:16 vertical reels, carousels & stories auto-publishing
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={`https://www.instagram.com/${currentIgHandle}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Instagram className="size-4" />
                      <span>View Live Profile</span>
                      <ExternalLink className="size-3.5" />
                    </a>

                    <button
                      type="button"
                      disabled={isVerifyingIg}
                      onClick={() => void handleVerifyInstagram()}
                      className="px-4 py-2.5 rounded-full bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6] text-xs font-bold text-[#BCCCE6] hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingIg ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                      <span>Verify</span>
                    </button>

                    <button
                      type="button"
                      disabled={isConnectingIg}
                      onClick={() => void handleConnectInstagram()}
                      className="px-4 py-2.5 rounded-full bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6] text-xs font-bold text-[#BCCCE6] hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isConnectingIg ? <Loader2 className="size-3.5 animate-spin" /> : <Edit3 className="size-3.5" />}
                      <span>Reconnect</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDisconnectModal(true)}
                      className="px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>

                {ig?.error && (
                  <p role="alert" className="text-xs text-amber-300">{ig.error}</p>
                )}

                {/* Feature Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]">Auto-Publishing</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400">Active</span>
                    </div>
                    <p className="text-sm font-bold text-white">Direct Meta Pipeline</p>
                    <p className="text-xs text-[#97A0B3] leading-relaxed">
                      Approved deliverables are immediately queued and pushed directly to your Instagram feed without manual mobile uploads.
                    </p>
                  </div>

                  <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]">Creative Formats</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#7FA0D6]/20 text-[#BCCCE6]">Optimized</span>
                    </div>
                    <p className="text-sm font-bold text-white">Safe Margins & Specs</p>
                    <p className="text-xs text-[#97A0B3] leading-relaxed">
                      Reels (9:16) and Carousels (4:5) are crafted to avoid Instagram UI overlays, captions, and profile badges.
                    </p>
                  </div>

                  <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]">Live Insights</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-500/15 text-purple-300">Syncing</span>
                    </div>
                    <p className="text-sm font-bold text-white">Reach & Saves Tracking</p>
                    <p className="text-xs text-[#97A0B3] leading-relaxed">
                      Displays organic reach, video completions, and saves on your Creo dashboard as your audience engages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 2: NOT CONNECTED - CONNECT WITH META (Facebook Login) */
            <div className="max-w-2xl mx-auto w-full">
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#7FA0D6] to-[#BCCCE6] text-[#0B111C] flex items-center justify-center font-black">
                    <Instagram className="size-6 text-[#0B111C]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {igNeedsReconnect ? "Reconnect Meta" : "Connect Instagram via Meta"}
                    </h3>
                    <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                      Sign in with Facebook and choose the Instagram Business account linked to a Page you manage. Creo never sees your Instagram password.
                    </p>
                  </div>
                  {igNeedsReconnect && (
                    <p role="alert" className="text-xs text-amber-300">
                      {ig?.error || "Your Meta authorization expired. Reconnect to resume publishing."}
                    </p>
                  )}
                  {ig && !ig.configured && (
                    <p className="text-xs text-amber-300">
                      Your agency still needs to finish Instagram setup. Try again once it is ready.
                    </p>
                  )}
                  {igQuery.isError && (
                    <p role="alert" className="text-xs text-rose-300">
                      {igQuery.error instanceof Error ? igQuery.error.message : "Could not load connection status."}{" "}
                      <button type="button" className="underline cursor-pointer" onClick={() => void igQuery.refetch()}>Retry</button>
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-[#2A3446]">
                  <button
                    type="button"
                    disabled={isConnectingIg || igQuery.isPending}
                    onClick={() => void handleConnectInstagram()}
                    className="w-full py-3.5 rounded-full bg-[#BCCCE6] hover:bg-white text-[#0B111C] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[#BCCCE6]/10 cursor-pointer"
                  >
                    {isConnectingIg ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Redirecting to Meta…</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        <span>{igNeedsReconnect ? "Reconnect with Facebook" : "Connect with Facebook"}</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-[#97A0B3]">
                    You can disconnect at any time here or in Facebook Business Integrations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: PROFILE & COMPANY SETTINGS */}
      {query.data && activeTab === "account" && (
        <section className="space-y-6 animate-in fade-in duration-300">
          <form onSubmit={save} className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A3446]">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Personal & Company Information</h2>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  Update the primary contact info and company name associated with your Creo workspace.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0B111C] border border-[#2A3446] text-[#BCCCE6]">
                Client Profile
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2">
                <span className="text-xs font-bold text-[#BCCCE6] flex items-center gap-2">
                  <User className="size-3.5 text-[#7FA0D6]" />
                  Full Name
                </span>
                <input
                  aria-label="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white text-sm focus:border-[#7FA0D6] focus:outline-none transition-colors"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[#BCCCE6] flex items-center gap-2">
                  <Building2 className="size-3.5 text-[#7FA0D6]" />
                  Company / Organization
                </span>
                <input
                  aria-label="Company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="e.g. Acme Studio"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white text-sm focus:border-[#7FA0D6] focus:outline-none transition-colors"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-[#BCCCE6] flex items-center gap-2">
                  <Phone className="size-3.5 text-[#7FA0D6]" />
                  Phone Number
                </span>
                <input
                  aria-label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white text-sm focus:border-[#7FA0D6] focus:outline-none transition-colors"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#BCCCE6] flex items-center gap-2">
                  <Mail className="size-3.5 text-[#7FA0D6]" />
                  Email Address
                </span>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0B111C]/80 border border-[#2A3446] text-[#97A0B3] text-sm">
                  <span>{query.data.email || user?.email || "Not provided"}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2A3446] flex items-center justify-between">
              <p className="text-xs text-[#97A0B3]">
                Changes apply immediately to your team communications and invoice records.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-full bg-[#BCCCE6] hover:bg-white text-[#0B111C] font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {busy ? "Saving Changes…" : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: SECURITY & ACCESS */}
      {query.data && activeTab === "security" && (
        <section className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password Sign-in Card */}
            <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="size-12 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] flex items-center justify-center">
                  <KeyRound className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Creo Password Sign-In</h3>
                  <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                    Set a standalone password for your email to log in directly without Google OAuth.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-[#97A0B3] space-y-1">
                  <p className="font-bold text-white">Google SSO Connected</p>
                  <p>You can continue using Google Single Sign-On with {query.data.email || user?.email}.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(true)}
                  className="w-full py-3 rounded-full bg-[#BCCCE6] hover:bg-white text-[#0B111C] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Set or Reset Password
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication Card */}
            <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="size-12 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] flex items-center justify-center">
                  <ShieldAlert className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Two-Factor Authentication</h3>
                  <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                    Add an extra layer of security when changing billing cards or modifying account credentials.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">Protection Status</p>
                    <p className="text-[#97A0B3]">
                      {query.data?.two_fa_enabled ? "Two-factor verification enabled" : "Currently not enforced"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      query.data?.two_fa_enabled
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-[#97A0B3] border border-[#2A3446]"
                    }`}
                  >
                    {query.data?.two_fa_enabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2A3446]">
                <button
                  type="button"
                  disabled={twoFaBusy}
                  onClick={() => void handleToggle2FA()}
                  className={`w-full py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    query.data?.two_fa_enabled
                      ? "bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                      : "bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6] text-white"
                  }`}
                >
                  {twoFaBusy ? (
                    <Loader2 className="size-4 animate-spin mx-auto" />
                  ) : query.data?.two_fa_enabled ? (
                    "Disable Two-Factor Auth"
                  ) : (
                    "Enable Two-Factor Auth"
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
        </>
      )}

      {/* Password Recovery Modal */}
      {recoveryOpen && (
        <PasswordRecoveryModal
          initialEmail={user?.email || ""}
          onClose={() => setRecoveryOpen(false)}
        />
      )}

      {/* Success Modal */}
      {message &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setMessage("")}
          >
            <div
              className="bg-[#161F2D] border border-[#2A3446] rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 m-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMessage("")}
                className="absolute top-4 right-4 size-7 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white tracking-tight">Success</h3>
                <p className="text-xs text-[#97A0B3] leading-relaxed">{message}</p>
              </div>

              <button
                type="button"
                onClick={() => setMessage("")}
                className="w-full py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold text-xs hover:bg-white transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Error Modal */}
      {errorMessage &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setErrorMessage("")}
          >
            <div
              className="bg-[#161F2D] border border-rose-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 m-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="absolute top-4 right-4 size-7 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="size-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/10">
                <AlertCircle className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white tracking-tight">Attention</h3>
                <p className="text-xs text-rose-200 leading-relaxed">{errorMessage}</p>
              </div>

              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="w-full py-2.5 rounded-full bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Confirm Disconnect Modal */}
      {confirmDisconnectModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setConfirmDisconnectModal(false)}
          >
            <div
              className="bg-[#161F2D] border border-rose-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 m-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="size-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <Instagram className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white tracking-tight">Disconnect Instagram?</h3>
                <p className="text-xs text-[#97A0B3] leading-relaxed">
                  Disconnecting <span className="text-white font-bold">@{currentIgHandle}</span> will pause automated publishing of approved reels and carousels.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDisconnectModal(false)}
                  className="flex-1 py-2.5 rounded-full bg-[#0B111C] border border-[#2A3446] text-white font-bold text-xs hover:bg-[#1E293B] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDisconnectingIg}
                  onClick={() => void handleDisconnectInstagram()}
                  className="flex-1 py-2.5 rounded-full bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDisconnectingIg ? <Loader2 className="size-4 animate-spin" /> : "Disconnect"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}
