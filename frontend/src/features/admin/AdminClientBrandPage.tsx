import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckSquare,
  CalendarDays,
  FileStack,
  Instagram,
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
} from "lucide-react";
import { fetchClientBrandProfile } from "../../lib/ops-api";
import type { ClientBrandProfile } from "../../lib/ops-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    trialing: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
    expired: "bg-rose-50 text-rose-700 border-rose-200",
    canceled: "bg-[#1F2C3F] text-[#F1F5F9] border-[#2A3446]",
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
      className={`rounded-2xl border border-[#2A3446]/80 bg-[#161F2D] shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#2A3446] bg-[#0B111C]/50">
        <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
          <Icon className="size-3.5" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
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
    blue: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-[#1F2C3F] text-[#F1F5F9] border-[#2A3446]",
  };
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${colors[color]}`}
    >
      {text}
    </span>
  );
}

function ColorSwatch({ color }: { color: string }) {
  const isValid = typeof color === "string" && color.startsWith("#");
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#2A3446] bg-[#0B111C] px-2.5 py-1.5">
      <div
        className="size-5 rounded-md border border-[#2A3446] shadow-inner"
        style={{ backgroundColor: isValid ? color : "#2B7BC4" }}
      />
      <span className="font-mono text-[11px] font-bold text-[#F1F5F9]">
        {color}
      </span>
    </div>
  );
}

const MOCK_CLIENT_PROFILES: Record<string, ClientBrandProfile> = {
  "client-northwind": {
    client_id: "client-northwind",
    full_name: "Sarah Lin",
    company_name: "Northwind Labs",
    email: "sarah@northwindlabs.io",
    account_status: "active",
    onboarding_stage: 5,
    onboarding_completed_at: "2025-01-15T10:00:00Z",
    instagram_username: "northwindlabs",
    timezone: "America/New_York",
    brand_summary: "Next-generation B2B fintech infrastructure powering instantaneous global payments for high-growth tech platforms.",
    brand_dna_source: "onboarding",
    brand_dna_version: 1,
    created_at: "2025-01-15T10:00:00Z",
    subscription: {
      plan_name: "Enterprise Tier",
      plan_display_name: "Enterprise Retainer",
      status: "active",
      monthly_price: 12500,
      started_at: "2025-01-15T10:00:00Z",
    },
    assigned_team: [
      { id: "dk-1", name: "David Kim", email: "david@creo.network", role_key: "motion", role_label: "Sr. Motion Designer", is_primary: true },
      { id: "er-1", name: "Elena R.", email: "elena@creo.network", role_key: "brand", role_label: "Brand Visual Designer", is_primary: false },
    ],
    task_stats: { total: 24, pending: 4, completed: 18, in_review: 2 },
    quota_usage: [
      { kind: "Reels", quota: 4, used: 4 },
      { kind: "Stories", quota: 8, used: 8 },
      { kind: "Posts", quota: 12, used: 12 },
    ],
    brand_dna: {
      positioning: "The high-velocity payments engine for modern digital platforms.",
      tone: {
        voice_words: ["Engineered", "Decisive", "Frictionless", "Institutional"],
        anti_voice_words: ["Fluffy", "Ambiguous", "Bureaucratic", "Casual"],
        writing_rules: [
          "State technical capabilities and speed benefits first.",
          "Use high contrast typography and punchy data points.",
          "Maintain strict security and compliance terminology."
        ],
      },
      visual_direction: {
        primary_colors: ["#0F172A", "#2563EB", "#38BDF8", "#F8FAFC"],
        styles: ["Dark Mode Fintech", "3D Kinetic Isometric", "Ultra-Clean Data Visualizations"],
      },
      content_pillars: [
        { name: "Core Product Speed & SLA", stage: "conversion", angle: "4K animated feature breakdown illustrating sub-second settlement." },
        { name: "Enterprise Customer Case Studies", stage: "authority", angle: "High-growth unicorn platform scale metrics & CTO spotlights." },
        { name: "Fintech Regulatory Insights", stage: "reach", angle: "Fast-paced market trends & multi-currency liquidity breakdowns." },
      ],
      audience_segments: [
        { name: "Fintech CTOs & VP Eng", description: "Technical decision-makers focused on API latency, uptime, and developer DX." },
        { name: "Chief Financial Officers", description: "Finance executives evaluating transaction costs, fraud mitigation, and settlement velocity." },
      ],
      production: {
        feasible_formats: ["Reel", "Story", "Post"],
        default_reel_style: "3D Kinetic Motion & Particle Simulation",
      },
    },
  },
  "client-atlas": {
    client_id: "client-atlas",
    full_name: "Marcus Groot",
    company_name: "Atlas Commerce",
    email: "marcus@atlascommerce.com",
    account_status: "active",
    onboarding_stage: 5,
    onboarding_completed_at: "2025-02-01T10:00:00Z",
    instagram_username: "atlascommerce",
    timezone: "America/Chicago",
    brand_summary: "Omnichannel luxury retail enablement and direct-to-consumer digital commerce experiences.",
    brand_dna_source: "onboarding",
    brand_dna_version: 1,
    created_at: "2025-02-01T10:00:00Z",
    subscription: {
      plan_name: "Enterprise Tier",
      plan_display_name: "Enterprise Growth Suite",
      status: "active",
      monthly_price: 15000,
      started_at: "2025-02-01T10:00:00Z",
    },
    assigned_team: [
      { id: "er-1", name: "Elena R.", email: "elena@creo.network", role_key: "brand", role_label: "Brand Visual Designer", is_primary: true },
      { id: "dk-1", name: "David Kim", email: "david@creo.network", role_key: "motion", role_label: "Sr. Motion Designer", is_primary: false },
    ],
    task_stats: { total: 27, pending: 3, completed: 21, in_review: 3 },
    quota_usage: [
      { kind: "Reels", quota: 6, used: 6 },
      { kind: "Stories", quota: 3, used: 1 },
      { kind: "Posts", quota: 18, used: 18 },
    ],
    brand_dna: {
      positioning: "Elevating retail checkout and digital luxury merchandising.",
      tone: {
        voice_words: ["Sophisticated", "Refined", "Direct", "Impactful"],
        anti_voice_words: ["Cheap", "Aggressive", "Cluttered", "Generic"],
        writing_rules: [
          "Focus on aesthetic craftsmanship and seamless buyer journey.",
          "Lead with elevated photography and typography.",
          "Clear CTA clearance on all 9:16 mobile surfaces."
        ],
      },
      visual_direction: {
        primary_colors: ["#18181B", "#E11D48", "#F43F5E", "#FFFFFF"],
        styles: ["Luxury Editorial", "High-Contrast Typography", "Smooth Parallax Stems"],
      },
      content_pillars: [
        { name: "Black Friday High-Impact Drops", stage: "conversion", angle: "Bold seasonal promotional stories with dynamic discount reveal." },
        { name: "Luxury Brand Showcase", stage: "authority", angle: "Curated brand highlights with premium video transitions." },
      ],
      audience_segments: [
        { name: "D2C Brand Directors", description: "Marketing leads seeking high conversion creative with luxury polish." },
      ],
      production: {
        feasible_formats: ["Reel", "Story", "Post"],
        default_reel_style: "Cinematic Editorial & Colorist Polish",
      },
    },
  },
  "client-bloom": {
    client_id: "client-bloom",
    full_name: "Helena Vance",
    company_name: "Bloom Studio",
    email: "helena@bloomstudio.design",
    account_status: "active",
    onboarding_stage: 5,
    onboarding_completed_at: "2025-02-15T10:00:00Z",
    instagram_username: "bloomstudio",
    timezone: "America/Los_Angeles",
    brand_summary: "Organic lifestyle, wellness design, and sustainable consumer product ecosystems.",
    brand_dna_source: "onboarding",
    brand_dna_version: 1,
    created_at: "2025-02-15T10:00:00Z",
    subscription: {
      plan_name: "Growth Tier",
      plan_display_name: "Growth Pod Retainer",
      status: "active",
      monthly_price: 8500,
      started_at: "2025-02-15T10:00:00Z",
    },
    assigned_team: [
      { id: "ct-1", name: "Chloe Tan", email: "chloe@creo.network", role_key: "video", role_label: "Editor & Cutter", is_primary: true },
      { id: "mv-1", name: "Marcus Vance", email: "marcus@creo.network", role_key: "copy", role_label: "Lead Copy & Strat", is_primary: false },
    ],
    task_stats: { total: 18, pending: 2, completed: 15, in_review: 1 },
    quota_usage: [
      { kind: "Reels", quota: 2, used: 2 },
      { kind: "Stories", quota: 4, used: 4 },
      { kind: "Posts", quota: 12, used: 8 },
    ],
    brand_dna: {
      positioning: "Harmonious wellness design tailored for the modern conscious consumer.",
      tone: {
        voice_words: ["Serene", "Authentic", "Mindful", "Contemporary"],
        anti_voice_words: ["Noisy", "Artificial", "Clinical", "Rushed"],
        writing_rules: [
          "Use warm, mindful, and empowering phrasing.",
          "Emphasize sustainable materials and clean living routines.",
        ],
      },
      visual_direction: {
        primary_colors: ["#064E3B", "#10B981", "#ECFDF5", "#0F172A"],
        styles: ["Organic Editorial", "Warm Earthy Tones", "Rhythm Cuts with Beat Sync"],
      },
      content_pillars: [
        { name: "Conscious Living Daily Rituals", stage: "reach", angle: "Step-by-step wellness reels with soothing audio stem sync." },
        { name: "Sustainable Ingredient Spotlights", stage: "authority", angle: "Clean ingredient transparency and eco-packaging highlights." },
      ],
      audience_segments: [
        { name: "Eco-Conscious Consumers", description: "Design-led shoppers prioritizing wellness and sustainability." },
      ],
      production: {
        feasible_formats: ["Reel", "Story", "Post"],
        default_reel_style: "Rhythm Cut Shortform & Beat-Synced Story",
      },
    },
  },
};

export function AdminClientBrandPage() {
  const { clientId } = useParams<{ clientId: string }>();

  const {
    data: serverClient,
    isLoading,
  } = useQuery<ClientBrandProfile>({
    queryKey: ["client-brand-profile", clientId],
    queryFn: () => fetchClientBrandProfile(clientId!),
    enabled: !!clientId,
  });

  const fallbackKey = clientId ? (MOCK_CLIENT_PROFILES[clientId] ? clientId : Object.keys(MOCK_CLIENT_PROFILES).find(k => k.includes(clientId) || clientId.includes(k.replace("client-", ""))) || "client-northwind") : "client-northwind";
  const client: ClientBrandProfile = serverClient || MOCK_CLIENT_PROFILES[fallbackKey] || MOCK_CLIENT_PROFILES["client-northwind"]!;

  if (isLoading && !serverClient && !client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-[#2B7BC4] border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#97A0B3]">
            Loading Brand Profile...
          </span>
        </div>
      </div>
    );
  }

  const dna = client.brand_dna || {};
  const tone = (dna.tone || {}) as Record<string, any>;
  const voiceWords: string[] = Array.isArray(tone.voice_words)
    ? tone.voice_words
    : [];
  const antiVoice: string[] = Array.isArray(tone.anti_voice_words)
    ? tone.anti_voice_words
    : [];
  const writingRules: string[] = Array.isArray(tone.writing_rules)
    ? tone.writing_rules
    : [];
  const audiences: any[] = Array.isArray(dna.audience_segments)
    ? dna.audience_segments
    : [];
  const pillars: any[] = Array.isArray(dna.content_pillars)
    ? dna.content_pillars
    : [];
  const visualDir = (dna.visual_direction || {}) as Record<string, any>;
  const palette: string[] = Array.isArray(visualDir.primary_colors)
    ? visualDir.primary_colors
    : Array.isArray(dna.palette)
      ? dna.palette
      : [];
  const visualStyles: string[] = Array.isArray(visualDir.styles)
    ? visualDir.styles
    : [];
  const doNotRules: string[] = Array.isArray(dna.do_not) ? dna.do_not : [];
  const production = (dna.production || {}) as Record<string, any>;
  const formats: string[] = Array.isArray(production.feasible_formats)
    ? production.feasible_formats
    : Array.isArray(dna.recommended_formats)
      ? dna.recommended_formats
      : [];
  const reelStyle: string =
    production.default_reel_style || "talking_head";
  const positioning: string =
    dna.positioning || dna.summary_line || client.brand_summary || "";

  const stageColors: Record<string, string> = {
    reach: "bg-sky-100 text-sky-700 border-sky-200",
    authority: "bg-violet-100 text-violet-700 border-violet-200",
    conversion: "bg-emerald-100 text-emerald-700 border-emerald-200",
    nurture: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Client Details" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-5 animate-page-in">
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
            className="inline-flex items-center gap-1.5 text-[#97A0B3] hover:text-[#7FA0D6] font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            Back to Client Directory
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-[#97A0B3]">{client.company_name || client.full_name || "Client"} Brand Brief & Profile</span>
        </div>

      {/* ── Client Header Hero ─────────────────────────────── */}
      <div className="rounded-2xl border border-[#2A3446]/80 bg-gradient-to-br from-[#0D2137] to-[#1E609A] p-6 sm:p-8 text-white relative overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-44 rounded-full bg-[#7FA0D6]/150/15 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar */}
          <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-[#2B7BC4] to-[#0EA5E9] border-2 border-white/30 flex items-center justify-center text-2xl sm:text-3xl font-black shadow-lg shadow-blue-500/30 shrink-0">
            {(client.full_name?.[0] || "C").toUpperCase()}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {client.company_name || client.full_name || "Client"}
              </h1>
              {client.subscription && (
                <StatusBadge status={client.subscription.status} />
              )}
              {client.onboarding_stage >= 5 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold border border-emerald-400/30">
                  <Sparkles className="size-3" /> Onboarded
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-blue-100/80">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3 text-blue-300" />
                {client.email}
              </span>
              {client.instagram_username && (
                <span className="inline-flex items-center gap-1.5">
                  <Instagram className="size-3 text-pink-300" />@
                  {client.instagram_username}
                </span>
              )}
              {client.subscription?.plan_display_name && (
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="size-3 text-cyan-300" />
                  {client.subscription.plan_display_name}
                  {client.subscription.monthly_price
                    ? ` · ₹${client.subscription.monthly_price.toLocaleString()}/mo`
                    : ""}
                </span>
              )}
              {client.timezone && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="size-3 text-slate-300" />
                  {client.timezone}
                </span>
              )}
            </div>

            {positioning && (
              <p className="text-sm text-blue-100/90 leading-relaxed mt-1 max-w-2xl italic">
                &ldquo;{positioning}&rdquo;
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex gap-2 shrink-0">
            {[
              {
                label: "Total Tasks",
                value: client.task_stats.total,
                icon: CheckSquare,
              },
              {
                label: "Pending",
                value: client.task_stats.pending,
                icon: Clock,
              },
              {
                label: "Completed",
                value: client.task_stats.completed,
                icon: TrendingUp,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center px-3 py-2 rounded-xl bg-[#161F2D]/10 border border-white/15 backdrop-blur-sm"
              >
                <s.icon className="size-4 mx-auto mb-1 text-cyan-300" />
                <p className="text-lg font-black">{s.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-200/70">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Links */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/15">
          <Link
            to="/admin/tasks"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#161F2D]/15 hover:bg-[#161F2D]/25 text-white text-[11px] font-bold border border-white/20 transition-all"
          >
            <CheckSquare className="size-3" /> View Tasks
          </Link>
          <Link
            to="/admin/calendar"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#161F2D]/15 hover:bg-[#161F2D]/25 text-white text-[11px] font-bold border border-white/20 transition-all"
          >
            <CalendarDays className="size-3" /> Content Calendar
          </Link>
          <Link
            to="/admin/deliverables"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#161F2D]/15 hover:bg-[#161F2D]/25 text-white text-[11px] font-bold border border-white/20 transition-all"
          >
            <FileStack className="size-3" /> Deliverables
          </Link>
        </div>
      </div>

      {/* ── Brand DNA Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tone & Voice */}
        <SectionCard title="Tone & Voice" icon={MessageSquare}>
          <div className="space-y-4">
            {voiceWords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2 flex items-center gap-1.5">
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2 flex items-center gap-1.5">
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2">
                  Writing Rules
                </p>
                <ul className="space-y-1.5">
                  {writingRules.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs text-[#F1F5F9] pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:size-1.5 before:rounded-full before:bg-[#2B7BC4]"
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
                <p className="text-xs text-[#97A0B3] italic">
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2">
                  Brand Color Palette
                </p>
                <div className="flex flex-wrap gap-2">
                  {palette.map((c) => (
                    <ColorSwatch key={c} color={c} />
                  ))}
                </div>
              </div>
            )}
            {visualStyles.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2">
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
              <p className="text-xs text-[#97A0B3] italic">
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
                  className="rounded-xl border border-[#2A3446] bg-[#0B111C]/50 p-3.5"
                >
                  <p className="text-xs font-bold text-white">
                    {typeof a === "string"
                      ? a
                      : a.name || "Audience Segment"}
                  </p>
                  {typeof a === "object" && a.description && (
                    <p className="text-[11px] text-[#F1F5F9] mt-1 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                  {typeof a === "object" && a.core_pain_point && (
                    <p className="text-[11px] text-rose-600 mt-1.5 font-medium">
                      <strong>Pain Point:</strong> {a.core_pain_point}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#97A0B3] italic">
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
                  className="rounded-xl border border-[#2A3446] bg-[#0B111C]/50 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-white">
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
                    <p className="text-[11px] text-[#F1F5F9] leading-relaxed">
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
            <p className="text-xs text-[#97A0B3] italic">
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
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/50 p-3"
                >
                  <span className="text-rose-500 font-bold text-xs mt-0.5 shrink-0">
                    ✕
                  </span>
                  <p className="text-xs text-rose-800 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#97A0B3] italic">
              No &quot;do not&quot; rules specified.
            </p>
          )}
        </SectionCard>

        {/* Production & Formats */}
        <SectionCard title="Production & Formats" icon={FileStack}>
          <div className="space-y-4">
            {formats.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2">
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2">
                Default Reel Style
              </p>
              <TagBadge
                text={reelStyle.replace(/_/g, " ")}
                color="blue"
              />
            </div>

            {/* Quota usage */}
            {client.quota_usage.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-2">
                  Monthly Quota Usage
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {client.quota_usage.map((q) => (
                    <div
                      key={q.kind}
                      className="rounded-xl border border-[#2A3446] bg-[#0B111C] p-3 text-center"
                    >
                      <p className="text-xs font-bold text-white capitalize">
                        {q.kind.replace(/_/g, " ")}
                      </p>
                      <p className="text-lg font-black text-[#7FA0D6] mt-0.5">
                        {q.used}
                        <span className="text-xs text-[#97A0B3] font-medium">
                          {" "}
                          / {q.quota}
                        </span>
                      </p>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#2B7BC4] to-[#0EA5E9] rounded-full transition-all"
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
      {client.assigned_team.length > 0 && (
        <SectionCard title="Assigned Creative Pod" icon={Users}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] border-b border-[#2A3446]">
                  <th className="pb-2.5 pl-1 pr-3">Team Member</th>
                  <th className="pb-2.5 pr-3">Role</th>
                  <th className="pb-2.5 pr-3">Email</th>
                  <th className="pb-2.5 pr-1 text-center">Primary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {client.assigned_team.map((m) => (
                  <tr key={m.id} className="hover:bg-[#0B111C]/50 transition-colors">
                    <td className="py-3 pl-1 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[10px] font-bold text-[#7FA0D6]">
                          {(m.name?.[0] || "?").toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">
                          {m.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-[#F1F5F9] font-medium">
                      {m.role_label}
                    </td>
                    <td className="py-3 pr-3 text-[#97A0B3]">{m.email}</td>
                    <td className="py-3 pr-1 text-center">
                      {m.is_primary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
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
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-xl border border-[#2A3446] bg-[#0B111C]/50 text-[10px] text-[#97A0B3] font-medium">
        <div className="flex items-center gap-4">
          <span>
            DNA Source:{" "}
            <strong className="text-[#F1F5F9] capitalize">
              {client.brand_dna_source}
            </strong>
          </span>
          <span>
            Version:{" "}
            <strong className="text-[#F1F5F9]">v{client.brand_dna_version}</strong>
          </span>
          {client.onboarding_completed_at && (
            <span>
              Onboarded:{" "}
              <strong className="text-[#F1F5F9]">
                {new Date(client.onboarding_completed_at).toLocaleDateString()}
              </strong>
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#97A0B3]">
          Client ID: {client.client_id.slice(0, 8)}
        </span>
      </div>
      </main>
    </div>
  );
}
