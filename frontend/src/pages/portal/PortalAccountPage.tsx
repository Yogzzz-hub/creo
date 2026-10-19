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
  Sparkles,
  KeyRound,
  ShieldAlert,
  X,
  Check,
  Loader2,
  Radio,
} from "lucide-react";

export function PortalAccountPage({ defaultTab = "settings" }: { defaultTab?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

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
    enabled: !!user?.id,
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
  const [igInput, setIgInput] = useState("");
  const [isConnectingIg, setIsConnectingIg] = useState(false);
  const [isDisconnectingIg, setIsDisconnectingIg] = useState(false);
  const [isEditingIg, setIsEditingIg] = useState(false);
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
      if (p.instagram_username) {
        setIgInput(p.instagram_username);
      }
    }
  }, [query.data]);

  // Save General Profile
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMessage("");
    try {
      await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: form.name,
          company_name: form.company,
          phone: form.phone,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      await query.refetch();
      setMessage("Your account details have been saved successfully.");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  // Instagram Connect
  async function handleConnectInstagram(overrideHandle?: string) {
    const raw = (overrideHandle || igInput || "").trim();
    if (!raw) {
      setErrorMessage("Please enter your Instagram handle.");
      return;
    }
    const cleanHandle = raw.startsWith("@") ? raw : `@${raw}`;
    setIsConnectingIg(true);
    setErrorMessage("");
    try {
      await request("/api/v1/portal/integrations/instagram/connect", {
        method: "POST",
        body: JSON.stringify({ username: cleanHandle }),
      });
      await queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      await query.refetch();
      setIsEditingIg(false);
      setMessage(`Instagram account ${cleanHandle} connected successfully!`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to connect Instagram account.");
    } finally {
      setIsConnectingIg(false);
    }
  }

  // Instagram Disconnect
  async function handleDisconnectInstagram() {
    setIsDisconnectingIg(true);
    setErrorMessage("");
    try {
      await request("/api/v1/portal/integrations/instagram", {
        method: "DELETE",
      });
      await queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      await query.refetch();
      setConfirmDisconnectModal(false);
      setIsEditingIg(false);
      setIgInput("");
      setMessage("Instagram account disconnected successfully.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to disconnect Instagram account.");
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

  const isIgConnected = Boolean(query.data?.instagram_connected || query.data?.instagram_username);
  const currentIgHandle = (query.data?.instagram_username || "").replace(/^@/, "");

  return (
    <main className="text-hi space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Tab Navigation & User Preview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-app-line/60">
        <nav aria-label="Account Settings Tabs" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setParams({ tab: "account" })}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "account"
                ? "bg-app-accent-soft text-app-base shadow-lg shadow-app-accent-soft/10 scale-[1.02]"
                : "bg-app-surface text-app-mist hover:text-white hover:bg-app-line-soft border border-app-line"
            }`}
          >
            <User className="size-4" />
            <span>Profile & Company</span>
          </button>

          <button
            type="button"
            onClick={() => setParams({ tab: "integrations" })}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer relative ${
              activeTab === "integrations"
                ? "bg-app-accent-soft text-app-base shadow-lg shadow-app-accent-soft/10 scale-[1.02]"
                : "bg-app-surface text-app-mist hover:text-white hover:bg-app-line-soft border border-app-line"
            }`}
          >
            <Instagram className="size-4" />
            <span>Instagram & Integrations</span>
            {isIgConnected ? (
              <span
                className={`size-2 rounded-full ml-0.5 ${
                  activeTab === "integrations" ? "bg-emerald-600" : "bg-emerald-400 animate-pulse"
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
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "security"
                ? "bg-app-accent-soft text-app-base shadow-lg shadow-app-accent-soft/10 scale-[1.02]"
                : "bg-app-surface text-app-mist hover:text-white hover:bg-app-line-soft border border-app-line"
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>Security & Password</span>
          </button>
        </nav>

        {/* User preview badge */}
        {query.data && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-app-surface border border-app-line shrink-0">
            <div className="size-8 rounded-full bg-gradient-to-tr from-app-accent to-app-accent-soft text-app-base font-black text-xs flex items-center justify-center uppercase shadow-sm">
              {(query.data.full_name || user?.email || "U").slice(0, 2)}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-hi leading-none truncate max-w-[140px]">
                {query.data.full_name || "Client Member"}
              </p>
              <p className="text-[10px] text-app-mist truncate max-w-[140px] mt-0.5">
                {query.data.email || user?.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {query.isPending && (
        <div className="bg-app-surface border border-app-line rounded-3xl p-12 text-center space-y-4">
          <Loader2 className="size-8 text-app-accent-soft animate-spin mx-auto" />
          <p className="text-sm font-semibold text-app-mist">Loading your account settings…</p>
        </div>
      )}
      {/* Error state */}
      {query.isError && (
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

      {/* TAB 1: INSTAGRAM & INTEGRATIONS */}
      {query.data && activeTab === "integrations" && (
        <section className="space-y-8 animate-in fade-in duration-300">
          {/* STATE 1: ALREADY CONNECTED - SHOW RICH CUSTOMER INSTAGRAM PROFILE */}
          {isIgConnected ? (
            <div className="space-y-6">
              <div className="bg-app-surface border border-app-line rounded-3xl p-6 sm:p-8 space-y-8">
                {/* Customer Profile Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-app-line">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="p-1 rounded-full bg-app-base border border-app-line">
                      <div className="size-16 sm:size-20 rounded-full bg-app-surface flex items-center justify-center text-hi">
                        <Instagram className="size-8 sm:size-10 text-app-accent-soft" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-black text-hi tracking-tight">
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
                      <p className="text-[11px] text-app-accent flex items-center gap-1">
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
                      className="px-4 py-2.5 rounded-full bg-app-accent-soft text-app-base text-xs font-bold hover:bg-hi transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Instagram className="size-4" />
                      <span>View Live Profile</span>
                      <ExternalLink className="size-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setIgInput(query.data.instagram_username || "");
                        setIsEditingIg(!isEditingIg);
                      }}
                      className="px-4 py-2.5 rounded-full bg-app-base border border-app-line hover:border-app-accent text-xs font-bold text-app-accent-soft hover:text-hi transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="size-3.5" />
                      <span>{isEditingIg ? "Cancel Edit" : "Change Handle"}</span>
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

                {/* Inline Edit Handle Form */}
                {isEditingIg && (
                  <div className="bg-app-base border border-app-line rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
                    <p className="text-xs font-bold text-hi">Update Connected Instagram Handle</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-app-mist">@</span>
                        <input
                          type="text"
                          value={igInput.replace(/^@/, "")}
                          onChange={(e) => setIgInput(e.target.value)}
                          placeholder="new_handle"
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-app-surface border border-app-line text-hi text-sm focus:border-app-accent focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isConnectingIg}
                        onClick={() => void handleConnectInstagram()}
                        className="px-6 py-2.5 rounded-xl bg-app-accent-soft text-app-base font-bold text-xs hover:bg-hi transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isConnectingIg ? <Loader2 className="size-4 animate-spin" /> : "Save Handle"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Feature Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-app-base border border-app-line rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist">Auto-Publishing</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400">Active</span>
                    </div>
                    <p className="text-sm font-bold text-hi">Direct Meta Pipeline</p>
                    <p className="text-xs text-app-mist leading-relaxed">
                      Approved deliverables are immediately queued and pushed directly to your Instagram feed without manual mobile uploads.
                    </p>
                  </div>

                  <div className="bg-app-base border border-app-line rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist">Creative Formats</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-app-accent/20 text-app-accent-soft">Optimized</span>
                    </div>
                    <p className="text-sm font-bold text-hi">Safe Margins & Specs</p>
                    <p className="text-xs text-app-mist leading-relaxed">
                      Reels (9:16) and Carousels (4:5) are crafted to avoid Instagram UI overlays, captions, and profile badges.
                    </p>
                  </div>

                  <div className="bg-app-base border border-app-line rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist">Live Insights</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-500/15 text-purple-300">Syncing</span>
                    </div>
                    <p className="text-sm font-bold text-hi">Reach & Saves Tracking</p>
                    <p className="text-xs text-app-mist leading-relaxed">
                      Displays organic reach, video completions, and saves on your Creo dashboard as your audience engages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 2: NOT CONNECTED YET - OFFER TO CONNECT OR CREATE AN INSTAGRAM ID */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Option 1: Link Existing Handle */}
              <div className="bg-app-surface border border-app-line rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="size-12 rounded-2xl bg-gradient-to-tr from-app-accent to-app-accent-soft text-app-base flex items-center justify-center font-black">
                    <Instagram className="size-6 text-app-base" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-hi tracking-tight">
                      Already Have an Instagram Account?
                    </h3>
                    <p className="text-xs text-app-mist mt-1 leading-relaxed">
                      Enter your brand or company handle below to link your profile to Creo's automated publishing pipeline.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-app-accent-soft block">
                      Instagram Handle
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-app-mist">@</span>
                      <input
                        type="text"
                        value={igInput.replace(/^@/, "")}
                        onChange={(e) => setIgInput(e.target.value)}
                        placeholder="yourbrandname"
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-app-base border border-app-line text-hi text-sm focus:border-app-accent focus:outline-none transition-colors"
                      />
                    </div>
                    {igInput && (
                      <p className="text-[11px] text-app-mist">
                        Target profile:{" "}
                        <span className="text-app-accent-soft font-mono">
                          instagram.com/{igInput.replace(/^@/, "")}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-app-line">
                  <button
                    type="button"
                    disabled={isConnectingIg || !igInput.trim()}
                    onClick={() => void handleConnectInstagram()}
                    className="w-full py-3.5 rounded-full bg-app-accent-soft hover:bg-hi text-app-base font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-app-accent-soft/10 cursor-pointer"
                  >
                    {isConnectingIg ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Connecting Handle…</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        <span>Link Instagram Account</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-app-mist">
                    You can disconnect or update your handle at any time.
                  </p>
                </div>
              </div>

              {/* Option 2: CREATE A NEW INSTAGRAM ID */}
              <div className="bg-app-surface border border-app-line rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="size-12 rounded-2xl bg-app-base border border-app-line text-app-accent-soft flex items-center justify-center shadow-sm">
                      <Sparkles className="size-6 text-app-accent" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-app-accent/15 text-app-accent-soft border border-app-accent/30">
                      New Account Setup
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-hi tracking-tight">
                      Don't Have an Instagram Account Yet?
                    </h3>
                    <p className="text-xs text-app-mist mt-1 leading-relaxed">
                      Creo publishes high-impact content directly to Instagram. If your business doesn't have an Instagram account yet, create one in 2 minutes for free!
                    </p>
                  </div>

                  {/* Quick Steps Guide */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-base border border-app-line">
                      <span className="size-5 rounded-full bg-app-accent/20 text-app-accent-soft font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <p className="text-xs font-bold text-hi">Create Account on Instagram</p>
                        <p className="text-[11px] text-app-mist">
                          Click the button below to register with your company email or phone.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-base border border-app-line">
                      <span className="size-5 rounded-full bg-app-accent/20 text-app-accent-soft font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <p className="text-xs font-bold text-hi">Switch to Professional / Creator</p>
                        <p className="text-[11px] text-app-mist">
                          In the Instagram app: Settings ➔ Account type ➔ Switch to Professional (Free & enables auto-publishing).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-app-base border border-app-line">
                      <span className="size-5 rounded-full bg-app-accent/20 text-app-accent-soft font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <p className="text-xs font-bold text-hi">Connect Your Handle Here</p>
                        <p className="text-[11px] text-app-mist">
                          Once created, enter your new handle in the box on the left to start publishing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct button to Instagram account registration */}
                <div className="space-y-3 pt-6 border-t border-app-line">
                  <a
                    href="https://www.instagram.com/accounts/emailsignup/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-full bg-app-accent-soft hover:bg-hi text-app-base font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Instagram className="size-4" />
                    <span>Create Instagram Account ↗</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                  <p className="text-[10px] text-center text-app-mist">
                    Opens official Instagram registration page in a new secure tab.
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
          <form onSubmit={save} className="bg-app-surface border border-app-line rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-app-line">
              <div>
                <h2 className="text-xl font-bold text-hi tracking-tight">Personal & Company Information</h2>
                <p className="text-xs text-app-mist mt-0.5">
                  Update the primary contact info and company name associated with your Creo workspace.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-app-base border border-app-line text-app-accent-soft">
                Client Profile
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2">
                <span className="text-xs font-bold text-app-accent-soft flex items-center gap-2">
                  <User className="size-3.5 text-app-accent" />
                  Full Name
                </span>
                <input
                  aria-label="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl bg-app-base border border-app-line text-hi text-sm focus:border-app-accent focus:outline-none transition-colors"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-app-accent-soft flex items-center gap-2">
                  <Building2 className="size-3.5 text-app-accent" />
                  Company / Organization
                </span>
                <input
                  aria-label="Company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="e.g. Acme Studio"
                  className="w-full px-4 py-3 rounded-xl bg-app-base border border-app-line text-hi text-sm focus:border-app-accent focus:outline-none transition-colors"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold text-app-accent-soft flex items-center gap-2">
                  <Phone className="size-3.5 text-app-accent" />
                  Phone Number
                </span>
                <input
                  aria-label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl bg-app-base border border-app-line text-hi text-sm focus:border-app-accent focus:outline-none transition-colors"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs font-bold text-app-accent-soft flex items-center gap-2">
                  <Mail className="size-3.5 text-app-accent" />
                  Email Address
                </span>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-app-base/80 border border-app-line text-app-mist text-sm">
                  <span>{query.data.email || user?.email || "Not provided"}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-app-line flex items-center justify-between">
              <p className="text-xs text-app-mist">
                Changes apply immediately to your team communications and invoice records.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-full bg-app-accent-soft hover:bg-hi text-app-base font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
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
            <div className="bg-app-surface border border-app-line rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="size-12 rounded-2xl bg-app-base border border-app-line text-app-accent flex items-center justify-center">
                  <KeyRound className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-hi tracking-tight">Creo Password Sign-In</h3>
                  <p className="text-xs text-app-mist mt-1 leading-relaxed">
                    Set a standalone password for your email to log in directly without Google OAuth.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-app-base border border-app-line text-xs text-app-mist space-y-1">
                  <p className="font-bold text-hi">Google SSO Connected</p>
                  <p>You can continue using Google Single Sign-On with {query.data.email || user?.email}.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-app-line">
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(true)}
                  className="w-full py-3 rounded-full bg-app-accent-soft hover:bg-hi text-app-base font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Set or Reset Password
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication Card */}
            <div className="bg-app-surface border border-app-line rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="size-12 rounded-2xl bg-app-base border border-app-line text-app-accent flex items-center justify-center">
                  <ShieldAlert className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-hi tracking-tight">Two-Factor Authentication</h3>
                  <p className="text-xs text-app-mist mt-1 leading-relaxed">
                    Add an extra layer of security when changing billing cards or modifying account credentials.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-app-base border border-app-line flex items-center justify-between text-xs">
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

              <div className="pt-4 border-t border-app-line">
                <button
                  type="button"
                  disabled={twoFaBusy}
                  onClick={() => void handleToggle2FA()}
                  className={`w-full py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    query.data?.two_fa_enabled
                      ? "bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                      : "bg-app-base border border-app-line hover:border-app-accent text-hi"
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
