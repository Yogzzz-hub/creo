import { CreoInlineLoader } from "../../components/ui/CreoLoader";
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
  ArrowUpRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  KeyRound,
  ShieldAlert,
  X,
  Loader2,
  Radio,
  Lock,
} from "lucide-react";
import { Instagram, Facebook } from "../../ui/brand-icons";
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
  const [connectingProvider, setConnectingProvider] = useState<"instagram" | "facebook" | null>(null);
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
    setConnectingProvider(provider);
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
    <div className="text-hi space-y-4 pb-4 w-full">
      {/* Tab Navigation & User Preview Header */}
      {/* Mobile Tab Bar (< md): 3-column static segmented bar */}
      <nav aria-label="Account Settings Tabs Mobile" className="grid grid-cols-3 gap-1.5 p-1 bg-app-surface rounded-xl border border-app-line md:hidden">
        <button
          type="button"
          onClick={() => setParams({ tab: "account" })}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
            activeTab === "account"
              ? "bg-app-accent-soft text-app-base shadow-sm"
              : "text-app-mist hover:text-hi"
          }`}
        >
          <User className="size-3.5" />
          <span>Profile</span>
          {isLocked && <Lock className="size-3 text-app-mist" />}
        </button>

        <button
          type="button"
          onClick={() => setParams({ tab: "integrations" })}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer relative ${
            activeTab === "integrations"
              ? "bg-app-accent-soft text-app-base shadow-sm"
              : "text-app-mist hover:text-hi"
          }`}
        >
          <Instagram className="size-3.5" />
          <span>Integrations</span>
          {isLocked ? (
            <Lock className="size-3 text-app-mist" />
          ) : isIgConnected ? (
            <span
              className={`size-1.5 rounded-full ${
                activeTab === "integrations" ? "bg-emerald-600 text-app-on-accent!" : "bg-emerald-400 animate-pulse text-app-on-accent!"
              }`}
            />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setParams({ tab: "security" })}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-app-accent-soft text-app-base shadow-sm"
              : "text-app-mist hover:text-hi"
          }`}
        >
          <ShieldCheck className="size-3.5" />
          <span>Security</span>
          {isLocked && <Lock className="size-3 text-app-mist" />}
        </button>
      </nav>

      {/* Desktop Tab Navigation (md:) */}
      <div className="hidden md:flex items-center justify-between gap-3 pb-2 border-b border-app-line/60">
        <nav aria-label="Account Settings Tabs" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setParams({ tab: "account" })}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "account"
                ? "bg-app-accent-soft text-app-base shadow-lg shadow-app-accent-soft/10 scale-[1.02]"
                : "bg-app-surface text-app-mist hover:text-hi hover:bg-app-line-soft border border-app-line"
            }`}
          >
            <User className="size-4" />
            <span>Profile & Company</span>
            {isLocked && <Lock className="size-3 text-app-mist ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setParams({ tab: "integrations" })}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer relative ${
              activeTab === "integrations"
                ? "bg-app-accent-soft text-app-base shadow-lg shadow-app-accent-soft/10 scale-[1.02]"
                : "bg-app-surface text-app-mist hover:text-hi hover:bg-app-line-soft border border-app-line"
            }`}
          >
            <Instagram className="size-4" />
            <span>Instagram & Integrations</span>
            {isLocked ? (
              <Lock className="size-3 text-app-mist ml-0.5" />
            ) : isIgConnected ? (
              <span
                className={`size-2 rounded-full ml-0.5 ${
                  activeTab === "integrations" ? "bg-emerald-600 text-app-on-accent!" : "bg-emerald-400 animate-pulse text-app-on-accent!"
                }`}
              />
            ) : (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ml-0.5 ${
                  activeTab === "integrations"
                    ? "bg-app-base/20 text-app-base"
                    : "bg-app-base text-app-mist border border-app-line"
                }`}
              >
                Connect
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setParams({ tab: "security" })}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-app-accent-soft text-app-base shadow-lg shadow-app-accent-soft/10 scale-[1.02]"
                : "bg-app-surface text-app-mist hover:text-hi hover:bg-app-line-soft border border-app-line"
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>Security & Password</span>
            {isLocked && <Lock className="size-3 text-app-mist ml-0.5" />}
          </button>
        </nav>

        {/* User preview badge (desktop only) */}
        {(query.data || user) && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-app-surface border border-app-line shrink-0">
            <div className="size-7 rounded-full bg-gradient-to-tr from-app-accent to-app-accent-soft text-app-base font-black text-[11px] flex items-center justify-center uppercase shadow-sm">
              {(query.data?.full_name || user?.full_name || user?.email || "U").slice(0, 2)}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-hi leading-none truncate max-w-[140px]">
                {query.data?.full_name || user?.full_name || "Client Member"}
              </p>
              <p className="text-[10px] text-app-mist truncate max-w-[140px] mt-0.5">
                {query.data?.email || user?.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {!isLocked && query.isPending && (
        <div className="bg-app-surface border border-app-line rounded-2xl p-8 text-center space-y-3">
          <CreoInlineLoader />
          <p className="text-sm font-semibold text-app-mist">Loading your account settings…</p>
        </div>
      )}
      {/* Error state */}
      {!isLocked && query.isError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="size-7 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-200">{query.error.message}</p>
          <button
            onClick={() => void query.refetch()}
            className="px-4 py-2 rounded-xl bg-rose-500 text-app-on-warm! font-bold text-xs hover:bg-rose-600 transition-colors"
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
        <section className="space-y-4 animate-in fade-in duration-300">
          {/* STATE 1: ALREADY CONNECTED - SHOW RICH CUSTOMER INSTAGRAM PROFILE */}
          {isIgConnected ? (
            <div className="space-y-4">
              <div className="bg-app-surface border border-app-line rounded-2xl p-4 sm:p-5 space-y-4">
                {/* Customer Profile Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app-line">
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    <div className="p-1 rounded-full bg-app-base border border-app-line">
                      <div className="size-14 sm:size-16 rounded-full bg-app-surface flex items-center justify-center text-hi">
                        <Instagram className="size-7 sm:size-8 text-app-accent-soft" />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-hi tracking-tight">
                          @{currentIgHandle}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Active Meta Sync
                        </span>
                      </div>
                      <p className="text-xs text-app-mist">
                        {form.company || query.data.company_name || query.data.full_name || "Client Brand"} · Business / Creator Account
                      </p>
                      <p className="text-[11px] text-app-accent flex items-center gap-1 pt-0.5">
                        <Radio className="size-3 animate-pulse text-emerald-400" />
                        Ready for 9:16 vertical reels, carousels & stories auto-publishing
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={`https://www.instagram.com/${currentIgHandle}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-full bg-app-accent-soft text-app-base text-xs font-bold hover:bg-hi transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Instagram className="size-3.5" />
                      <span>View Live Profile</span>
                      <ExternalLink className="size-3" />
                    </a>

                    <button
                      type="button"
                      disabled={isVerifyingIg}
                      onClick={() => void handleVerifyInstagram()}
                      className="px-3.5 py-2 rounded-full bg-app-base border border-app-line hover:border-app-accent text-xs font-bold text-app-accent-soft hover:text-hi transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingIg ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                      <span>Verify</span>
                    </button>

                    <button
                      type="button"
                      disabled={isConnectingIg}
                      onClick={() => void handleConnectInstagram()}
                      className="px-3.5 py-2 rounded-full bg-app-base border border-app-line hover:border-app-accent text-xs font-bold text-app-accent-soft hover:text-hi transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isConnectingIg ? <Loader2 className="size-3.5 animate-spin" /> : <Edit3 className="size-3.5" />}
                      <span>Reconnect</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDisconnectModal(true)}
                      className="px-3.5 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="bg-app-base border border-app-line rounded-xl p-3.5 sm:p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist">Auto-Publishing</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400">Active</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-hi">Direct Meta Pipeline</p>
                    <p className="text-xs text-app-mist leading-relaxed">
                      Approved deliverables are immediately queued and pushed directly to your Instagram feed without manual mobile uploads.
                    </p>
                  </div>

                  <div className="bg-app-base border border-app-line rounded-xl p-3.5 sm:p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist">Creative Formats</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-app-accent/20 text-app-accent-soft">Optimized</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-hi">Safe Margins & Specs</p>
                    <p className="text-xs text-app-mist leading-relaxed">
                      Reels (9:16) and Carousels (4:5) are crafted to avoid Instagram UI overlays, captions, and profile badges.
                    </p>
                  </div>

                  <div className="bg-app-base border border-app-line rounded-xl p-3.5 sm:p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist">Live Insights</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-500/15 text-purple-300">Syncing</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-hi">Reach & Saves Tracking</p>
                    <p className="text-xs text-app-mist leading-relaxed">
                      Displays organic reach, video completions, and saves on your Creo dashboard as your audience engages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Slim Connect Rows (< md) */}
              <div className="space-y-2 md:hidden">
            {([
              { provider: "instagram", title: "Instagram", subtitle: "Direct connection", label: "Connect", Icon: Instagram, color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]" },
              { provider: "facebook", title: "Facebook", subtitle: "Via Facebook Page", label: "Connect", Icon: Facebook, color: "bg-[#1877F2]" },
            ] as const).map(({ provider, title, subtitle, label, Icon, color }) => (
              <div key={provider} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-app-line bg-app-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-hi ${color}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-hi leading-tight">{title}</h4>
                      <span className="text-[10px] text-app-accent font-medium truncate">· {subtitle}</span>
                    </div>
                    <p className="text-[11px] text-app-mist truncate">Auto-publish reels & posts</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isConnectingIg || igQuery.isPending}
                  onClick={() => void handleConnectInstagram(provider)}
                  className="shrink-0 px-3.5 py-1.5 rounded-lg bg-app-accent-soft text-app-base font-bold text-xs hover:bg-hi transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Icon className={`size-3 ${isConnectingIg && connectingProvider === provider ? "animate-pulse" : ""}`} />
                  <span>{isConnectingIg && connectingProvider === provider ? "Connecting..." : label}</span>
                </button>
              </div>
            ))}
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-app-mist pt-1">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span>Password stays with Meta. Disconnect anytime.</span>
            </p>
          </div>

          {/* Desktop Grid (md:) */}
          <div className="hidden md:grid md:grid-cols-2 gap-4">
            {([
              { provider: "instagram", title: "Instagram", subtitle: "Connect directly", description: "Connect your Business or Creator account. No Facebook Page needed.", label: "Connect Instagram", Icon: Instagram, badge: "Direct connection", color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]" },
              { provider: "facebook", title: "Facebook", subtitle: "Connect a linked Instagram account", description: "Sign in with Facebook and choose the Page linked to your Instagram professional account.", label: "Connect with Facebook", Icon: Facebook, badge: "Via Facebook Page", color: "bg-[#1877F2]" },
            ] as const).map(({ provider, title, subtitle, description, label, Icon, badge, color }) => (
              <section key={provider} className="flex flex-col rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-hi ${color}`}><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="rounded-full border border-app-line px-2.5 py-0.5 text-[10px] font-semibold text-app-accent-soft">{badge}</span>
                </div>
                <h3 className="mt-3.5 text-base sm:text-lg font-bold text-hi">{title}</h3>
                <p className="mt-0.5 text-xs font-semibold text-app-accent-soft">{subtitle}</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-app-mist">{description}</p>
                <button type="button" disabled={isConnectingIg || igQuery.isPending} onClick={() => void handleConnectInstagram(provider)}
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-app-accent-soft px-4 py-2.5 text-xs sm:text-sm font-bold text-app-base hover:bg-hi disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent">
                  <Icon className={`size-3.5 ${isConnectingIg && connectingProvider === provider ? "animate-pulse motion-reduce:animate-none" : ""}`} aria-hidden="true" />
                  {isConnectingIg && connectingProvider === provider ? "Opening authorization..." : label}
                  {!(isConnectingIg && connectingProvider === provider) && <ArrowUpRight className="size-3.5" aria-hidden="true" />}
                </button>
              </section>
            ))}
            <p className="md:col-span-2 flex items-center justify-center gap-2 text-[11px] text-app-mist"><ShieldCheck className="size-3.5 shrink-0" />Your password stays with Instagram or Facebook. You can disconnect anytime.</p>
            {igNeedsReconnect && <p role="alert" className="md:col-span-2 text-xs text-amber-300">{ig?.error || "Choose a connection method to reconnect."}</p>}
            {igQuery.isError && <p role="alert" className="md:col-span-2 text-xs text-rose-300">Could not check your connection. <button type="button" className="underline" onClick={() => void igQuery.refetch()}>Retry</button></p>}
          </div>
        </>
      )}
    </section>
      )}

      {/* TAB 2: PROFILE & COMPANY SETTINGS */}
      {query.data && activeTab === "account" && (
        <section className="space-y-4 animate-in fade-in duration-300">
          <form onSubmit={save} className="bg-app-surface border border-app-line rounded-xl md:rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-app-line">
              <div>
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-hi tracking-tight">Personal & Company Information</h2>
                <p className="text-[11px] sm:text-xs text-app-mist mt-0.5">
                  Update the primary contact info and company name associated with your Creo workspace.
                </p>
              </div>
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-app-base border border-app-line text-app-accent-soft shrink-0 ml-2">
                Client Profile
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5 md:gap-4">
              <label className="col-span-1 space-y-1 sm:space-y-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-app-accent-soft flex items-center gap-1.5 truncate">
                  <User className="size-3 sm:size-3.5 text-app-accent shrink-0" />
                  <span className="truncate">Full Name</span>
                </span>
                <input
                  aria-label="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl bg-app-base border border-app-line text-hi text-xs sm:text-sm focus:border-app-accent focus:outline-none transition-colors"
                />
              </label>

              <label className="col-span-1 space-y-1 sm:space-y-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-app-accent-soft flex items-center gap-1.5 truncate">
                  <Building2 className="size-3 sm:size-3.5 text-app-accent shrink-0" />
                  <span className="truncate">Company</span>
                </span>
                <input
                  aria-label="Company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="e.g. Acme Studio"
                  className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl bg-app-base border border-app-line text-hi text-xs sm:text-sm focus:border-app-accent focus:outline-none transition-colors"
                />
              </label>

              <label className="col-span-1 space-y-1 sm:space-y-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-app-accent-soft flex items-center gap-1.5 truncate">
                  <Phone className="size-3 sm:size-3.5 text-app-accent shrink-0" />
                  <span className="truncate">Phone</span>
                </span>
                <input
                  aria-label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl bg-app-base border border-app-line text-hi text-xs sm:text-sm focus:border-app-accent focus:outline-none transition-colors"
                />
              </label>

              <div className="col-span-1 space-y-1 sm:space-y-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-app-accent-soft flex items-center gap-1.5 truncate">
                  <Mail className="size-3 sm:size-3.5 text-app-accent shrink-0" />
                  <span className="truncate">Email</span>
                </span>
                <div className="flex items-center justify-between px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl bg-app-base/80 border border-app-line text-app-mist text-xs sm:text-sm min-h-[34px] sm:min-h-[42px]">
                  <span className="truncate text-xs">{query.data.email || user?.email || "—"}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-app-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] sm:text-xs text-app-mist">
                Changes apply immediately to your team communications and invoice records.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-full bg-app-accent-soft hover:bg-hi text-app-base font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm self-end sm:self-auto"
              >
                {busy ? "Saving Changes…" : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: SECURITY & ACCESS */}
      {query.data && activeTab === "security" && (
        <section className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password Sign-in Card */}
            <div className="bg-app-surface border border-app-line rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="size-10 rounded-xl bg-app-base border border-app-line text-app-accent flex items-center justify-center">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-hi tracking-tight">Creo Password Sign-In</h3>
                  <p className="text-xs text-app-mist mt-0.5 leading-relaxed">
                    Set a standalone password for your email to log in directly without Google OAuth.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-app-base border border-app-line text-xs text-app-mist space-y-1">
                  <p className="font-bold text-hi">Google SSO Connected</p>
                  <p>You can continue using Google Single Sign-On with {query.data.email || user?.email}.</p>
                </div>
              </div>

              <div className="pt-3.5 border-t border-app-line">
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(true)}
                  className="w-full py-2.5 rounded-full bg-app-accent-soft hover:bg-hi text-app-base font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Set or Reset Password
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication Card */}
            <div className="bg-app-surface border border-app-line rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="size-10 rounded-xl bg-app-base border border-app-line text-app-accent flex items-center justify-center">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-hi tracking-tight">Two-Factor Authentication</h3>
                  <p className="text-xs text-app-mist mt-0.5 leading-relaxed">
                    Add an extra layer of security when changing billing cards or modifying account credentials.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-app-base border border-app-line flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-hi">Protection Status</p>
                    <p className="text-app-mist">
                      {query.data?.two_fa_enabled ? "Two-factor verification enabled" : "Currently not enforced"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      query.data?.two_fa_enabled
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-app-mist border border-app-line"
                    }`}
                  >
                    {query.data?.two_fa_enabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="pt-3.5 border-t border-app-line">
                <button
                  type="button"
                  disabled={twoFaBusy}
                  onClick={() => void handleToggle2FA()}
                  className={`w-full py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    query.data?.two_fa_enabled
                      ? "bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                      : "bg-app-base border border-app-line hover:border-app-accent text-hi"
                  }`}
                >
                  {twoFaBusy ? (
                    <Loader2 className="size-3.5 animate-spin mx-auto" />
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
              className="bg-app-surface border border-app-line rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 m-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMessage("")}
                className="absolute top-4 right-4 size-7 rounded-lg border border-app-line bg-app-base flex items-center justify-center text-app-mist hover:text-hi transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-hi tracking-tight">Success</h3>
                <p className="text-xs text-app-mist leading-relaxed">{message}</p>
              </div>

              <button
                type="button"
                onClick={() => setMessage("")}
                className="w-full py-2.5 rounded-full bg-app-accent-soft text-app-base font-bold text-xs hover:bg-hi transition-all shadow-sm active:scale-95 cursor-pointer"
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
              className="bg-app-surface border border-rose-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 m-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="absolute top-4 right-4 size-7 rounded-lg border border-app-line bg-app-base flex items-center justify-center text-app-mist hover:text-hi transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="size-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/10">
                <AlertCircle className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-hi tracking-tight">Attention</h3>
                <p className="text-xs text-rose-200 leading-relaxed">{errorMessage}</p>
              </div>

              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="w-full py-2.5 rounded-full bg-rose-500 text-app-on-warm! font-bold text-xs hover:bg-rose-600 transition-all shadow-sm active:scale-95 cursor-pointer"
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
              className="bg-app-surface border border-rose-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 m-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="size-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <Instagram className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-hi tracking-tight">Disconnect Instagram?</h3>
                <p className="text-xs text-app-mist leading-relaxed">
                  Disconnecting <span className="text-hi font-bold">@{currentIgHandle}</span> will pause automated publishing of approved reels and carousels.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDisconnectModal(false)}
                  className="flex-1 py-2.5 rounded-full bg-app-base border border-app-line text-hi font-bold text-xs hover:bg-app-line-soft transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDisconnectingIg}
                  onClick={() => void handleDisconnectInstagram()}
                  className="flex-1 py-2.5 rounded-full bg-rose-500 text-app-on-warm! font-bold text-xs hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDisconnectingIg ? <Loader2 className="size-4 animate-spin" /> : "Disconnect"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
