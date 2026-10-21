import { PublishingQueue } from "../../components/ops/PublishingPanel";
import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CheckSquare,
  CalendarDays,
  FileStack,
  Mail,
  Shield,
  Sparkles,
  Users,
  Palette,
  Target,
  MessageSquare,
  Zap,
  AlertTriangle,
  Globe,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
  Type,
} from "lucide-react";
import { Instagram } from "../../ui/brand-icons";
import { fetchClientBrandProfile } from "../../lib/ops-api";
import type { ClientBrandProfile } from "../../lib/ops-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    trialing: "bg-app-accent/15 text-app-accent border-app-accent/30",
    expired: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    canceled: "bg-app-surface text-app-ink-2 border-app-line",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${colors[status] || colors.active}`}
    >
      <span
        className={`size-1.5 rounded-full ${status === "active" || status === "trialing" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
      />
      {status}
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-app-line/80 bg-app-surface shadow-sm overflow-hidden hover-card-innovative ${className}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-app-line bg-app-base/50">
        <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
          <Icon className="size-3.5" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-hi">
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function TagBadge({
  text,
  color = "blue",
}: {
  text: string;
  color?: "blue" | "red" | "green" | "amber" | "slate";
}) {
  const colors = {
    blue: "bg-app-accent/15 text-app-accent border-app-accent/30",
    red: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    slate: "bg-app-surface text-app-ink-2 border-app-line",
  };
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${colors[color]}`}
    >
      {text}
    </span>
  );
}

function ColorSwatch({ color, index }: { color: string | any; index?: number }) {
  const labels = [
    "Primary Brand",
    "Accent / Secondary",
    "Surface / Canvas",
    "Glow / Highlight",
  ];
  const hex = typeof color === "string" ? color : (color?.hex || color?.color || "#0F172A");
  const name = typeof color === "object" && color?.name ? color.name : (index !== undefined && labels[index] ? labels[index] : `Accent Tone ${(index ?? 0) + 1}`);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-app-line bg-app-base px-3 py-2 min-w-[130px] shadow-xs">
      <div
        className="size-6 rounded-lg border border-hi/20 shadow-inner shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-semibold text-app-mist truncate">
          {name}
        </span>
        <span className="font-mono text-xs font-bold text-hi uppercase truncate">
          {hex}
        </span>
      </div>
    </div>
  );
}

export function AdminClientBrandPage() {
  const { clientId } = useParams<{ clientId: string }>();

  const {
    data: serverClient,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ClientBrandProfile>({
    queryKey: ["client-brand-profile", clientId],
    queryFn: () => fetchClientBrandProfile(clientId!),
    enabled: !!clientId,
  });

  if (isLoading) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Brand DNA" />;
  }

  // A failed or empty fetch previously fell through to the loading screen, which then
  // span forever. Surface the reason and a way out instead.
  if (isError || !serverClient) {
    return (
      <div data-surface="ops" className="min-h-screen bg-app-base text-hi">
        <AdminTopHeader title="Client Details" activeTab="Client Details" />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-lg font-black">This client profile could not be loaded</h1>
          <p role="alert" className="text-sm text-app-mist">
            {error instanceof Error
              ? error.message
              : "The client was not found, or you are not assigned to them."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-10 rounded-xl bg-app-accent-soft px-5 text-xs font-bold text-app-base hover:bg-hi cursor-pointer"
            >
              Try again
            </button>
            <Link
              to="/lead/clients"
              className="inline-flex min-h-10 items-center rounded-xl border border-app-line bg-app-surface px-5 text-xs font-bold text-app-accent-soft hover:text-hi cursor-pointer"
            >
              Back to client allocations
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const client: ClientBrandProfile = serverClient;

  const dna = (client.brand_dna && typeof client.brand_dna === "object") ? client.brand_dna : {};
  const tone = (typeof dna.tone === "object" && dna.tone !== null) ? (dna.tone as Record<string, any>) : {};
  const voiceWords: string[] = Array.isArray(tone.voice_words) && tone.voice_words.length > 0
    ? tone.voice_words.map((w: any) => (typeof w === "string" ? w : (w?.word || w?.name || String(w))))
    : Array.isArray(dna.tone_keywords) && dna.tone_keywords.length > 0
      ? dna.tone_keywords.map((w: any) => (typeof w === "string" ? w : (w?.word || w?.name || String(w))))
      : typeof dna.tone === "string" && dna.tone.trim()
        ? dna.tone.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
  const antiVoice: string[] = Array.isArray(tone.anti_voice_words)
    ? tone.anti_voice_words.map((w: any) => (typeof w === "string" ? w : (w?.word || w?.name || String(w))))
    : [];
  const writingRules: string[] = Array.isArray(tone.writing_rules)
    ? tone.writing_rules.map((r: any) => (typeof r === "string" ? r : (r?.rule || r?.text || String(r))))
    : [];
  const audiences: any[] = Array.isArray(dna.audience_segments) && dna.audience_segments.length > 0
    ? dna.audience_segments
    : typeof dna.target_audience === "string" && dna.target_audience
      ? [{ name: "Target Audience", description: dna.target_audience }]
      : [];
  const pillars: any[] = Array.isArray(dna.content_pillars)
    ? dna.content_pillars
    : [];
  const visualDir = (typeof dna.visual_direction === "object" && dna.visual_direction !== null)
    ? (dna.visual_direction as Record<string, any>)
    : {};
  const isPaid = !!(
    (client.subscription && ["active", "trialing", "paid"].includes(client.subscription.status.toLowerCase())) ||
    ((client.subscription?.monthly_price ?? 0) > 0)
  );
  const isOnboarded = !!(
    client.onboarding_completed_at ||
    (typeof client.onboarding_stage === "number" && client.onboarding_stage >= 4)
  );
  const lifecycleStatus: "not_paid_not_onboarded" | "paid_not_onboarded" | "onboarded" =
    isOnboarded
      ? "onboarded"
      : isPaid
        ? "paid_not_onboarded"
        : "not_paid_not_onboarded";

  const CANONICAL_PALETTE = ["#161F2D", "#7FA0D6", "#3E5A74", "#BCCCE6"];
  const rawPalette: any[] = Array.isArray(dna.palette) && dna.palette.length > 0
    ? dna.palette
    : Array.isArray(visualDir.primary_colors) && visualDir.primary_colors.length > 0
      ? visualDir.primary_colors
      : CANONICAL_PALETTE;

  const extractedPalette: string[] = [];
  if (Array.isArray(rawPalette)) {
    rawPalette.forEach((item: any) => {
      const hex = typeof item === "string" ? item.trim() : (item?.hex || item?.color || "").trim();
      if (hex && hex.startsWith("#")) {
        extractedPalette.push(hex.toUpperCase());
      }
    });
  }
  const palette: string[] = [0, 1, 2, 3].map((i) => extractedPalette[i] || CANONICAL_PALETTE[i] || "#161F2D");
  if (extractedPalette.length > 4) {
    for (let i = 4; i < extractedPalette.length; i++) {
      if (extractedPalette[i]) {
        palette.push(extractedPalette[i]!);
      }
    }
  }
  const visualStyles: string[] = Array.isArray(visualDir.styles)
    ? visualDir.styles.map((s: any) => (typeof s === "string" ? s : (s?.name || String(s))))
    : [];
  const doNotRules: string[] = Array.isArray(dna.do_not)
    ? dna.do_not.map((r: any) => (typeof r === "string" ? r : (r?.rule || r?.text || String(r))))
    : [];
  const production = (typeof dna.production === "object" && dna.production !== null)
    ? (dna.production as Record<string, any>)
    : {};
  const formats: string[] = Array.isArray(production.feasible_formats)
    ? production.feasible_formats.map((f: any) => (typeof f === "string" ? f : (f?.name || String(f))))
    : Array.isArray(dna.recommended_formats)
      ? dna.recommended_formats.map((f: any) => (typeof f === "string" ? f : (f?.name || String(f))))
      : [];
  const reelStyle: string =
    production.default_reel_style || "talking_head";
  const positioning: string =
    dna.positioning || dna.summary_line || client.brand_summary || "";

  const stageColors: Record<string, string> = {
    reach: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    authority: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
    conversion: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    nurture: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-app-base flex flex-col">
      <AdminTopHeader activeTab="Client Details" />
      <motion.main 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 px-3.5 sm:px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-5 animate-page-in"
      >
        {/* ── Back Navigation ────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 2) {
                window.history.back();
              } else {
                window.location.assign("/lead/clients");
              }
            }}
            className="inline-flex items-center gap-1.5 text-app-mist hover:text-app-accent font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            Back to Client Directory
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-app-mist">{client.company_name || client.full_name || "Client"} Brand Brief & Profile</span>
        </div>

      {/* ── Client Header Hero ─────────────────────────────── */}
      {(() => {
        const displayName = client.company_name || client.full_name || "Client";
        const initials = displayName
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "C";

        return (
          <div className="rounded-2xl border border-app-line bg-app-surface p-5 sm:p-7 text-hi relative overflow-hidden shadow-xl shadow-black/40">
            {/* Subtle ambient glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-blue-600/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-indigo-600/10 blur-3xl" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              {/* Avatar with authentic initials */}
              <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-lg shadow-blue-900/40 shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-hi">
                    {displayName}
                  </h1>
                  {lifecycleStatus === "onboarded" ? (
                    <>
                      {client.subscription && (
                        <StatusBadge status={client.subscription.status} />
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        <Sparkles className="size-3" /> Onboarded
                      </span>
                    </>
                  ) : lifecycleStatus === "paid_not_onboarded" ? (
                    <>
                      {client.subscription && (
                        <StatusBadge status={client.subscription.status} />
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 text-[10px] font-bold border border-sky-500/30">
                        user paid but not onboarded
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                      user not paid and not onboarded yet
                    </span>
                  )}
                </div>

                {/* Status Alert Banner for Un-onboarded Clients */}
                {lifecycleStatus === "not_paid_not_onboarded" && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 my-2">
                    <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-amber-300">
                        user not paid and not onboarded yet
                      </p>
                      <p className="text-[11px] text-app-ink-3 leading-relaxed">
                        This client has registered/logged in but has not completed payment or the brand onboarding intake questionnaire. Mock deliverables and assets are disabled.
                      </p>
                    </div>
                  </div>
                )}
                {lifecycleStatus === "paid_not_onboarded" && (
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 flex items-start gap-3 my-2">
                    <AlertTriangle className="size-5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-sky-300">
                        user paid but not onboarded
                      </p>
                      <p className="text-[11px] text-app-ink-3 leading-relaxed">
                        Subscription payment is verified and active. However, the client has not finalized their brand onboarding questionnaire yet. Brand DNA and creative pod assignment are pending.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-app-mist">
                  <span className="inline-flex items-center gap-1.5 font-medium text-app-ink-2">
                    <Mail className="size-3.5 text-app-accent" />
                    {client.email}
                  </span>
                  {client.instagram_username && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-app-ink-2">
                      <Instagram className="size-3.5 text-pink-400" />@
                      {client.instagram_username}
                    </span>
                  )}
                  {client.subscription?.plan_display_name && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-app-ink-2">
                      <Shield className="size-3.5 text-cyan-400" />
                      {client.subscription.plan_display_name}
                      {client.subscription.monthly_price
                        ? ` · ₹${Number(client.subscription.monthly_price).toLocaleString()}/mo`
                        : ""}
                    </span>
                  )}
                  {client.timezone && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-app-ink-2">
                      <Globe className="size-3.5 text-emerald-400" />
                      {client.timezone}
                    </span>
                  )}
                </div>

                {positioning && (
                  <div className="mt-3 p-3.5 rounded-xl border border-app-line bg-app-base/80">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-1">
                      Brand Positioning & Mission
                    </p>
                    <p className="text-xs sm:text-sm text-app-ink-2 leading-relaxed italic">
                      &ldquo;{positioning}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2.5 shrink-0 w-full sm:w-auto justify-center sm:justify-end mt-3 sm:mt-0">
                {[
                  {
                    label: "Total Tasks",
                    value: isOnboarded ? (client.task_stats?.total ?? 0) : 0,
                    icon: CheckSquare,
                    color: "text-app-accent",
                  },
                  {
                    label: "Pending",
                    value: isOnboarded ? (client.task_stats?.pending ?? 0) : 0,
                    icon: Clock,
                    color: "text-amber-400",
                  },
                  {
                    label: "Completed",
                    value: isOnboarded ? (client.task_stats?.completed ?? 0) : 0,
                    icon: TrendingUp,
                    color: "text-emerald-400",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center px-3.5 py-2.5 rounded-xl bg-app-base border border-app-line flex-1 min-w-[80px]"
                  >
                    <s.icon className={`size-4 mx-auto mb-1 ${s.color}`} />
                    <p className="text-lg font-black text-hi">{s.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-app-mist">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Links */}
            <div className="relative z-10 flex flex-wrap gap-2 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-app-line">
              <Link
                to="/admin/tasks"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-base hover:bg-app-surface text-app-ink-2 text-[11px] font-bold border border-app-line transition-all"
              >
                <CheckSquare className="size-3 text-app-accent" /> View Tasks
              </Link>
              <Link
                to="/admin/calendar"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-base hover:bg-app-surface text-app-ink-2 text-[11px] font-bold border border-app-line transition-all"
              >
                <CalendarDays className="size-3 text-cyan-400" /> Content Calendar
              </Link>
              <Link
                to="/admin/deliverables"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-app-base hover:bg-app-surface text-app-ink-2 text-[11px] font-bold border border-app-line transition-all"
              >
                <FileStack className="size-3 text-emerald-400" /> Deliverables
              </Link>
            </div>
          </div>
        );
      })()}

      {/* ── Brand DNA Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tone & Voice */}
        <SectionCard title="Tone & Voice" icon={MessageSquare}>
          <div className="space-y-4">
            {voiceWords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2 flex items-center gap-1.5">
                  <Eye className="size-3" /> Voice Words
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {voiceWords.map((w) => (
                    <TagBadge key={w} text={w} color="blue" />
                  ))}
                </div>
              </div>
            )}
            {antiVoice.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2 flex items-center gap-1.5">
                  <EyeOff className="size-3" /> Anti-Voice (Avoid)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {antiVoice.map((w) => (
                    <TagBadge key={w} text={`✕ ${w}`} color="red" />
                  ))}
                </div>
              </div>
            )}
            {writingRules.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2">
                  Writing Rules
                </p>
                <ul className="space-y-1.5">
                  {writingRules.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs text-app-ink-2 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:size-1.5 before:rounded-full before:bg-app-accent"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {voiceWords.length === 0 &&
              antiVoice.length === 0 &&
              writingRules.length === 0 && (
                <p className="text-xs text-app-mist italic">
                  No tone data available yet. Brand DNA will be generated once
                  the client completes the questionnaire.
                </p>
              )}
          </div>
        </SectionCard>

        {/* Visual Direction */}
        <SectionCard title="Visual Direction" icon={Palette}>
          <div className="space-y-4">
            {palette.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2">
                  Brand Color Palette
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {palette.map((c, idx) => (
                    <ColorSwatch key={`${c}-${idx}`} color={c} index={idx} />
                  ))}
                </div>
              </div>
            )}
            {/* Typography Pairing */}
            <div className="pt-2 border-t border-app-line/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2 flex items-center gap-1.5">
                <Type className="size-3 text-app-accent" /> Typography Pairing & System
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-app-base border border-app-line rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist block mb-1">
                    Headlines / Display
                  </span>
                  <p className="text-sm font-bold text-hi">
                    {dna.typography?.headline || visualDir.headings_font || "Inter Display · 700 Bold"}
                  </p>
                  <p className="text-[11px] text-app-mist mt-0.5">
                    Bold, punchy titles optimized for feed stops.
                  </p>
                </div>
                <div className="bg-app-base border border-app-line rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist block mb-1">
                    Body Copy / Subtitles
                  </span>
                  <p className="text-sm font-normal text-hi">
                    {dna.typography?.body || visualDir.body_font || "Inter Sans · 400 Regular"}
                  </p>
                  <p className="text-[11px] text-app-mist mt-0.5">
                    High legibility for reel captions and carousel body copy.
                  </p>
                </div>
              </div>
            </div>
            {visualStyles.length > 0 && (
              <div className="pt-2 border-t border-app-line/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2">
                  Visual Styles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {visualStyles.map((s) => (
                    <TagBadge key={s} text={s} color="slate" />
                  ))}
                </div>
              </div>
            )}
            {palette.length === 0 && visualStyles.length === 0 && (
              <p className="text-xs text-app-mist italic">
                No visual direction data available yet.
              </p>
            )}
          </div>
        </SectionCard>

        {/* Audience Segments */}
        <SectionCard title="Audience Segments" icon={Target}>
          {audiences.length > 0 ? (
            <div className="space-y-3">
              {audiences.map((a: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-app-line bg-app-base/50 p-3.5"
                >
                  <p className="text-xs font-bold text-hi">
                    {typeof a === "string"
                      ? a
                      : a.name || "Audience Segment"}
                  </p>
                  {typeof a === "object" && a.description && (
                    <p className="text-[11px] text-app-ink-2 mt-1 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                  {typeof a === "object" && a.core_pain_point && (
                    <p className="text-[11px] text-rose-400 mt-1.5 font-medium">
                      <strong>Pain Point:</strong> {a.core_pain_point}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-app-mist italic">
              No audience segment data available.
            </p>
          )}
        </SectionCard>

        {/* Content Pillars */}
        <SectionCard title="Content Pillars" icon={Zap}>
          {pillars.length > 0 ? (
            <div className="space-y-3">
              {pillars.map((p: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-app-line bg-app-base/50 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-hi">
                      {typeof p === "string" ? p : p.name || "Content Pillar"}
                    </p>
                    {typeof p === "object" && p.funnel_stage && (
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          stageColors[
                            (p.funnel_stage as string)?.toLowerCase()
                          ] || stageColors.reach
                        }`}
                      >
                        {p.funnel_stage}
                      </span>
                    )}
                  </div>
                  {typeof p === "object" && p.rationale && (
                    <p className="text-[11px] text-app-ink-2 leading-relaxed">
                      {p.rationale}
                    </p>
                  )}
                  {typeof p === "object" &&
                    Array.isArray(p.best_formats) &&
                    p.best_formats.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.best_formats.map((f: string) => (
                          <TagBadge key={f} text={f} color="blue" />
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-app-mist italic">
              No content pillar data available.
            </p>
          )}
        </SectionCard>
      </div>

      {/* ── Do / Don't Rules + Production Row ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Do Not Rules */}
        <SectionCard title="Do Not Rules" icon={AlertTriangle}>
          {doNotRules.length > 0 ? (
            <div className="space-y-2">
              {doNotRules.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3"
                >
                  <span className="text-rose-400 font-bold text-xs mt-0.5 shrink-0">
                    ✕
                  </span>
                  <p className="text-xs text-rose-200 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-app-mist italic">
              No &quot;do not&quot; rules specified.
            </p>
          )}
        </SectionCard>

        {/* Production & Formats */}
        <SectionCard title="Production & Formats" icon={FileStack}>
          <div className="space-y-4">
            {formats.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2">
                  Feasible Formats
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {formats.map((f) => (
                    <TagBadge key={f} text={f} color="green" />
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2">
                Default Reel Style
              </p>
              <TagBadge
                text={reelStyle.replace(/_/g, " ")}
                color="blue"
              />
            </div>

            {/* Quota usage */}
            {Array.isArray(client.quota_usage) && client.quota_usage.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-2">
                  Monthly Quota Usage
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {client.quota_usage.map((q) => (
                    <div
                      key={q.kind}
                      className="rounded-xl border border-app-line bg-app-base p-3 text-center"
                    >
                      <p className="text-xs font-bold text-hi capitalize">
                        {q.kind.replace(/_/g, " ")}
                      </p>
                      <p className="text-lg font-black text-app-accent mt-0.5">
                        {q.used}
                        <span className="text-xs text-app-mist font-medium">
                          {" "}
                          / {q.quota}
                        </span>
                      </p>
                      <p className="text-[10px] font-bold text-emerald-400 mt-0.5">
                        {Math.max(0, q.quota - q.used)} remaining
                      </p>
                      <div className="w-full h-1.5 bg-app-base border border-app-line rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-app-accent rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, q.quota > 0 ? (q.used / q.quota) * 100 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Assigned Pod Team ──────────────────────────────── */}
      {Array.isArray(client.assigned_team) && client.assigned_team.length > 0 && (
        <SectionCard title="Assigned Creative Pod" icon={Users}>
          <div className="overflow-x-auto -mx-1 -mr-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-app-mist border-b border-app-line">
                  <th className="pb-2.5 pl-1 pr-3">Team Member</th>
                  <th className="pb-2.5 pr-3">Role</th>
                  <th className="pb-2.5 pr-3">Email</th>
                  <th className="pb-2.5 pr-1 text-center">Primary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-line">
                {client.assigned_team.map((m) => (
                  <tr key={m.id} className="hover:bg-app-base/50 transition-colors">
                    <td className="py-3 pl-1 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-[10px] font-bold text-app-accent">
                          {(m.name?.[0] || "?").toUpperCase()}
                        </div>
                        <span className="font-semibold text-hi">
                          {m.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-app-ink-2 font-medium">
                      {m.role_label}
                    </td>
                    <td className="py-3 pr-3 text-app-mist">{m.email}</td>
                    <td className="py-3 pr-1 text-center">
                      {m.is_primary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          Primary
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Brand DNA Meta Footer ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3 py-3 px-3 sm:px-4 rounded-xl border border-app-line bg-app-base/50 text-[10px] text-app-mist font-medium">
        <div className="flex items-center gap-4">
          <span>
            DNA Source:{" "}
            <strong className="text-app-ink-2 capitalize">
              {client.brand_dna_source}
            </strong>
          </span>
          <span>
            Version:{" "}
            <strong className="text-app-ink-2">v{client.brand_dna_version}</strong>
          </span>
          {client.onboarding_completed_at && (
            <span>
              Onboarded:{" "}
              <strong className="text-app-ink-2">
                {new Date(client.onboarding_completed_at).toLocaleDateString()}
              </strong>
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider text-app-mist">
          Client ID: {(client.client_id || "").slice(0, 8)}
        </span>
      </div>
        <PublishingQueue clientId={clientId} />
      </motion.main>
    </div>
  );
}
