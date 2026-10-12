import { InstagramConnection } from "../../components/portal/InstagramConnection";
import { BrandGuidelines } from "../../components/portal/BrandGuidelines";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { PasswordRecoveryModal } from "../../components/auth/PasswordRecoveryModal";
import { resolveAssetUrl } from "../../lib/media";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
export function PortalAccountPage({ defaultTab = "settings" }: { defaultTab?: string }) {
  const { user } = useAuth();
  const gate = useOnboardingGate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || defaultTab;
  const brand = ["brand", "edit-brand"].includes(tab);
  const query = useQuery({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request<any>("/api/v1/portal/profile"),
    enabled: !!user?.id,
  });
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    summary: "",
    audience: "",
    voice: "",
    colors: "",
    instagram: "",
  });
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  useEffect(() => {
    if (query.data) {
      const p = query.data;
      setForm({
        instagram: p.instagram_username || "",
        name: p.full_name || "",
        company: p.company_name || "",
        phone: p.phone || "",
        summary: p.brand_summary || p.brand_dna?.summary_line || p.brand_dna?.team_brief?.brand_summary || "",
        audience: typeof p.brand_dna?.target_audience === "string" ? p.brand_dna.target_audience : "",
        voice: Array.isArray(p.brand_dna?.tone_keywords) ? p.brand_dna.tone_keywords.filter((v: unknown) => typeof v === "string").join(", ") : "",
        colors: Array.isArray(p.brand_dna?.brand_colors) ? p.brand_dna.brand_colors.filter((v: unknown) => typeof v === "string").join(", ") : "",
      });
    }
  }, [query.data]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [message]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify(
          brand
            ? {
                company_name: form.company,
                instagram_username: form.instagram,
                brand_summary: form.summary,
                brand_dna: {
                  ...(query.data?.brand_dna || {}),
                  summary_line: form.summary,

                },
              }
            : { full_name: form.name, company_name: form.company, phone: form.phone },
        ),
      });
      await query.refetch();
      setMessageType("success");
      setMessage("Changes saved.");
    } catch (e) {
      setMessageType("error");
      setMessage(e instanceof Error ? e.message : "Changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  if (tab === "instagram") return <InstagramConnection />;
  if (brand && gate.isReady && !gate.isComplete)
    return (
      <SubscriptionLockedState
        title="Brand DNA locked"
        description="Complete onboarding to manage your brand guidelines."
      />
    );
  const accountName = form.name || user?.full_name || user?.email || "Your profile";
  const accountEmail = query.data?.email || user?.email || "Not provided";
  const initials = accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "CR";
  const inputClass = "h-12 w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-4 text-sm text-white outline-none transition placeholder:text-[#66738A] focus:border-[#7FA0D6] focus:ring-2 focus:ring-[#7FA0D6]/20";
  const tabButton = (active: boolean) =>
    `inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B111C] cursor-pointer ${active ? "bg-[#BCCCE6] text-[#0B111C] shadow-[0_4px_16px_rgba(127,160,214,0.18)]" : "text-[#97A0B3] hover:bg-white/[0.05] hover:text-white"}`;
  return (
    <div className="w-full min-w-0 space-y-6 text-white">
      <header className="flex flex-col gap-5 rounded-3xl border border-[#2A3446] bg-[radial-gradient(ellipse_at_top_left,rgba(127,160,214,0.12),transparent_55%),#111927] p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#7FA0D6]/20 bg-[#7FA0D6]/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9CB8E5]">
            <Settings2 className="size-3.5" /> Workspace preferences
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{brand ? "Brand DNA" : "Your account"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#97A0B3]">
            {brand
              ? "Keep your brand details and creative direction current for your team."
              : "Manage your profile, sign-in preferences, and the people working with your brand."}
          </p>
        </div>
        {!brand && (
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#2A3446] bg-[#0B111C]/70 p-3.5 sm:min-w-[280px]">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#D2DDF0]/30 bg-[#BCCCE6] text-sm font-extrabold text-[#0B111C] shadow-[0_6px_20px_rgba(127,160,214,0.15)]">{initials}</div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#748198]">Signed in as</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{accountEmail}</p>
            </div>
            <BadgeCheck className="ml-auto size-4 shrink-0 text-[#7FA0D6]" aria-label="Account" />
          </div>
        )}
      </header>
      {query.isPending && <p role="status">Loading profile…</p>}
      {query.isError && (
        <div role="alert" className="flex flex-col gap-4 rounded-2xl border border-rose-800/50 bg-rose-950/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertCircle className="size-5 shrink-0 text-rose-400" />
            <span>{query.error.message || "Your account details could not be loaded."}</span>
          </div>
          <button type="button" onClick={() => void query.refetch()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-700/50 bg-rose-950/40 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer">
            Try again <ArrowRight className="size-4" />
          </button>
        </div>
      )}
      {message && typeof document !== "undefined" && createPortal(
        <div role={messageType === "error" ? "alert" : "status"} aria-live={messageType === "error" ? "assertive" : "polite"} className={`fixed bottom-6 right-6 z-[100000] flex w-[min(420px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border p-4 text-sm shadow-2xl backdrop-blur-xl animate-fade-in ${messageType === "error" ? "border-rose-800/70 bg-[#161F2D]/95 text-rose-100" : "border-emerald-700/50 bg-[#161F2D]/95 text-emerald-100"}`}>
          {messageType === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />}
          <span className="min-w-0 flex-1 leading-5">{message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss notification" className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-[#97A0B3] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] cursor-pointer">
            <X className="size-4" />
          </button>
        </div>,
        document.body,
      )}
      {!brand && (() => {
        const methods = user?.sign_in_methods ?? [];
        const hasPassword = methods.includes("password");
        const hasGoogle = methods.includes("google");
        return (
          <section className="overflow-hidden rounded-3xl border border-[#2A3446] bg-[#161F2D] shadow-[0_18px_48px_rgba(3,8,16,0.12)]">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#7FA0D6]/20 bg-[#7FA0D6]/10 text-[#8EACDE]"><ShieldCheck className="size-5" /></div>
                <div>
                  <h2 className="font-bold text-white">Sign-in &amp; security</h2>
                  <p className="mt-1 text-xs leading-5 text-[#97A0B3]">
                    {hasPassword
                      ? "Change your password with an email verification code."
                      : "Add a password to sign in with email while keeping Google sign-in available."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecoveryOpen(true)}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#344259] bg-[#0B111C] px-4 text-sm font-semibold text-[#BCCCE6] transition hover:border-[#7FA0D6]/60 hover:bg-[#1A2433] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] sm:w-auto cursor-pointer"
              >
                <KeyRound className="size-4" /> {hasPassword ? "Change password" : "Set a password"}
              </button>
            </div>
            <div className="grid gap-px border-t border-[#2A3446] bg-[#2A3446] sm:grid-cols-2">
              <div className="flex items-center gap-3 bg-[#0B111C]/55 px-5 py-3.5 sm:px-6">
                <BadgeCheck className="size-4 text-[#7FA0D6]" />
                <span className="text-xs text-[#97A0B3]">Google</span>
                <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${hasGoogle ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.05] text-[#97A0B3]"}`}>
                  {hasGoogle ? "CONNECTED" : "NOT CONNECTED"}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-[#0B111C]/55 px-5 py-3.5 sm:px-6">
                <KeyRound className="size-4 text-[#7FA0D6]" />
                <span className="text-xs text-[#97A0B3]">Email &amp; password</span>
                <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${hasPassword ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.05] text-[#97A0B3]"}`}>
                  {hasPassword ? "ENABLED" : "NOT SET"}
                </span>
              </div>
            </div>
          </section>
        );
      })()}
      {recoveryOpen && <PasswordRecoveryModal initialEmail={user?.email || ""} onClose={() => setRecoveryOpen(false)} />}
      {query.data && (
        <>
          <nav className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-[#2A3446] bg-[#0B111C] p-1.5" aria-label="Account sections">
            <button
              type="button"
              aria-pressed={tab === "settings"}
              onClick={() => setParams({ tab: "settings" })}
              className={tabButton(tab === "settings")}
            >
              Account
            </button>
            <button
              type="button"
              aria-pressed={brand}
              onClick={() => setParams({ tab: "brand" })}
              className={tabButton(brand)}
            >
              Brand DNA
            </button>
            <Link
              to="/portal/account/instagram"
              aria-current={tab === "instagram" ? "page" : undefined}
              className={tabButton(tab === "instagram")}
            >
              Instagram connection
            </Link>
          </nav>
          <form
            onSubmit={save}
            className="overflow-hidden rounded-3xl border border-[#2A3446] bg-[#161F2D] shadow-[0_18px_48px_rgba(3,8,16,0.16)]"
          >
            <div className="flex items-start gap-3.5 border-b border-[#2A3446] px-5 py-5 sm:px-7">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#7FA0D6]/20 bg-[#7FA0D6]/10 text-[#8EACDE]">
                {brand ? <Building2 className="size-5" /> : <UserRound className="size-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{brand ? "Brand profile" : "Personal details"}</h2>
                <p className="mt-1 text-xs leading-5 text-[#97A0B3]">
                  {brand
                    ? "Share the details your team needs to create on-brand work."
                    : "These details help your creative team identify and contact you."}
                </p>
              </div>
              <span className="ml-auto hidden rounded-full border border-[#2A3446] bg-[#0B111C]/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] sm:inline-flex">
                {brand ? "Brand" : "Profile"}
              </span>
            </div>
            <div className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-7">
            {(brand
              ? ["company", "instagram", "summary"]
              : ["name", "company", "phone"]
            ).map((key) => (
              <label key={key} className={`block min-w-0 space-y-2 ${key === "phone" || key === "summary" ? "sm:col-span-2" : ""}`}>
                <span className="text-xs font-semibold text-[#C5CDDA]">
                  {
                    {
                      name: "Name",
                      company: "Company",
                      phone: "Phone",
                      summary: "Brand summary",
                      audience: "Target audience",
                      voice: "Tone keywords (comma separated)",
                      colors: "Brand colors (comma separated)",
                      instagram: "Instagram handle",
                    }[key]
                  }
                </span>
                <input
                  aria-label={key}
                  value={form[key as keyof typeof form]}
                  placeholder={key === "company" ? "Your company or studio" : key === "phone" ? "Add a contact number" : key === "instagram" ? "@yourbrand" : undefined}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
            {!brand && (
              <div className="flex min-w-0 items-center gap-3 border-t border-[#2A3446] pt-5 sm:col-span-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#2A3446] bg-[#0B111C] text-[#8290A6]"><Mail className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#748198]">Account email</p>
                  <p className="mt-1 truncate text-sm font-medium text-white">{accountEmail}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end border-t border-[#2A3446] pt-5 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#BCCCE6] px-5 text-sm font-bold text-[#0B111C] shadow-[0_6px_18px_rgba(127,160,214,0.15)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161F2D] disabled:cursor-wait disabled:opacity-60 cursor-pointer"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {busy ? "Saving changes" : "Save changes"}
            </button>
            </div>
            </div>
          </form>
          {brand && (
            <section className="bg-[#161F2D] p-5 rounded-3xl space-y-3">
              <BrandGuidelines dna={query.data.brand_dna || {}} />
              <h2 className="font-bold">Brand files</h2>
              {!query.data.brand_dna?.files?.length && <p>No brand files uploaded.</p>}
              {query.data.brand_dna?.files?.map((f: any, i: number) => (
                <p key={f.id || i}>
                  {f.url || f.file_url ? (
                    <a
                      className="underline"
                      href={resolveAssetUrl(f.url || f.file_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {f.name || "Brand file"}
                    </a>
                  ) : (
                    f.name || "File details unavailable"
                  )}
                  {f.size && ` · ${f.size}`}
                </p>
              ))}
            </section>
          )}
          {!brand && (
            <section className="rounded-3xl border border-[#2A3446] bg-[#161F2D] p-5 shadow-[0_18px_48px_rgba(3,8,16,0.16)] sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-[#7FA0D6]/20 bg-[#7FA0D6]/10 text-[#8EACDE]"><UsersRound className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-white">Your assigned team</h2>
                  <p className="mt-1 text-xs text-[#97A0B3]">The creative specialists supporting your workspace.</p>
                </div>
                {!!query.data.assigned_team?.length && (
                  <span className="rounded-full border border-[#344259] bg-[#0B111C]/70 px-3 py-1 text-[10px] font-bold text-[#BCCCE6]">
                    {query.data.assigned_team.length} {query.data.assigned_team.length === 1 ? "MEMBER" : "MEMBERS"}
                  </span>
                )}
              </div>
              {!query.data.assigned_team?.length ? (
                <div className="rounded-2xl border border-dashed border-[#344259] bg-[#0B111C]/40 px-5 py-8 text-center">
                  <UsersRound className="mx-auto size-6 text-[#748198]" />
                  <p className="mt-3 text-sm font-semibold text-white">Your team is being prepared</p>
                  <p className="mt-1 text-xs text-[#97A0B3]">Your assigned specialists will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {query.data.assigned_team.map((m: any) => {
                    const name = m.name || m.full_name || m.email || "Team member";
                    const memberInitials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
                    return (
                      <article key={m.id || m.email} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#2A3446] bg-[#0B111C]/55 p-4 transition hover:border-[#7FA0D6]/40 hover:bg-[#0B111C]/80">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#BCCCE6]/20 bg-[#7FA0D6]/15 text-xs font-extrabold text-[#BCCCE6]">{memberInitials || "CR"}</div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
                          <p className="mt-1 truncate text-xs text-[#97A0B3]">{m.role || m.raw_role || "Creative specialist"}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
