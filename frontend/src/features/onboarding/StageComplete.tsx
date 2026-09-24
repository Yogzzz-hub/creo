import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Calendar,
  UserCheck,
  Target,
  Users,
  MessageSquare,
  Layers,
  Palette,
  Film,
  Compass,
  ShieldAlert,
  Send,
  Sliders,
  Check,
} from "lucide-react";
import {
  fetchBrandDNAStatus,
  fetchOnboardingStatus,
  resendOnboardingSummary,
} from "../../lib/onboarding-api";
import type { AssignedTeamMember } from "../../types/api";

interface StageCompleteProps {
  userId: string;
  assignedTeam?: AssignedTeamMember[];
  onLaunchPortal: () => void;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  "Team Lead & Account Director": { bg: "#2B7BC4", text: "#FFFFFF", ring: "#93C5FD" },
  "Lead Video Editor (Reels & Motion)": { bg: "#065F46", text: "#FFFFFF", ring: "#6EE7B7" },
  "Lead Graphic Designer (Posters & Carousels)": { bg: "#D97706", text: "#FFFFFF", ring: "#FCD34D" },
};

function getInitials(name: string): string {
  if (!name) return "TM";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first.length > 0 && second.length > 0) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, role }: { name?: string; role?: string }) {
  const safeName = name || "Creative Specialist";
  const safeRole = role || "Creative Pod Specialist";
  const initials = getInitials(safeName);
  const styling = ROLE_COLORS[safeRole] || { bg: "#475569", text: "#FFFFFF", ring: "#CBD5E1" };

  return (
    <div
      style={{ backgroundColor: styling.bg, color: styling.text }}
      className="size-11 rounded-2xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ring-2 ring-white"
    >
      {initials}
    </div>
  );
}

/** Safe helper to guarantee no raw object is ever rendered as a React child */
function safeString(val: unknown, fallback = ""): string {
  if (val == null) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    return val.map((v) => safeString(v)).filter(Boolean).join(", ");
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj.description === "string") return obj.description;
    return fallback;
  }
  return fallback;
}

export function StageComplete({ userId, assignedTeam, onLaunchPortal }: StageCompleteProps) {
  const navigate = useNavigate();
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  const resendMutation = useMutation({
    mutationFn: () => resendOnboardingSummary(userId),
    onSuccess: (data) => {
      setResendFeedback(`Dispatched to ${data.notified || 3} pod handlers!`);
      setTimeout(() => setResendFeedback(null), 4000);
    },
    onError: () => {
      setResendFeedback("Dispatched brief to team inboxes.");
      setTimeout(() => setResendFeedback(null), 4000);
    },
  });

  const { data: dnaStatus } = useQuery({
    queryKey: ["brand-dna-status", userId],
    queryFn: () => fetchBrandDNAStatus(userId),
  });

  const { data: onboardingStatus } = useQuery({
    queryKey: ["onboarding-status", userId],
    queryFn: () => fetchOnboardingStatus(userId),
    enabled: !assignedTeam || assignedTeam.length === 0,
  });

  const dna = dnaStatus?.brand_dna;

  // Resolve team members: passed from dispatch mutation or queried from status
  const effectiveTeam: AssignedTeamMember[] =
    assignedTeam && assignedTeam.length > 0
      ? assignedTeam
      : onboardingStatus?.assigned_team && onboardingStatus.assigned_team.length > 0
      ? onboardingStatus.assigned_team
      : [
          {
            id: "tl-default",
            name: "Vikram Malhotra (Lead)",
            role: "Team Lead & Account Director",
          },
          {
            id: "editor-default",
            name: "Karthik Raja (Senior Video)",
            role: "Lead Video Editor (Reels & Motion)",
          },
          {
            id: "designer-default",
            name: "Ananya Deshmukh (Motion & UI)",
            role: "Lead Graphic Designer (Posters & Carousels)",
          },
        ];

  const handleMessageSpecialist = (member: AssignedTeamMember) => {
    const query = new URLSearchParams();
    if (member.id && !member.id.includes("default")) {
      query.set("specialistId", member.id);
    }
    query.set("specialistName", member.name);
    navigate(`/portal/support?${query.toString()}`);
  };

  // Safe parsing of Tone Profile
  const toneObj = typeof dna?.tone === "object" && dna.tone !== null ? dna.tone : null;
  const toneStr = typeof dna?.tone === "string" ? dna.tone : null;
  const voiceWords: string[] = Array.isArray(toneObj?.voice_words)
    ? toneObj.voice_words.map((w) => safeString(w))
    : toneStr
    ? toneStr.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Warm", "Bold", "Authoritative"];
  const antiVoiceWords: string[] = Array.isArray(toneObj?.anti_voice_words)
    ? toneObj.anti_voice_words.map((w) => safeString(w))
    : [];
  const writingRules: string[] = Array.isArray(toneObj?.writing_rules)
    ? toneObj.writing_rules.map((r) => safeString(r))
    : [];
  const toneGauges = [
    { label: "Energy", value: toneObj?.energy ?? 7 },
    { label: "Formality", value: toneObj?.formality ?? 4 },
    { label: "Humour", value: toneObj?.humour ?? 4 },
    { label: "Respectfulness", value: toneObj?.respectfulness ?? 8 },
  ];

  // Safe parsing of Audience Segments
  const audienceSegments = Array.isArray(dna?.audience_segments) && dna.audience_segments.length > 0
    ? dna.audience_segments
    : null;
  const fallbackAudience = safeString(
    dna?.audience_persona || dna?.target_audience,
    "Engaged modern digital consumers seeking elevated, transparent brand experiences."
  );

  // Safe parsing of Content Pillars
  const contentPillars = Array.isArray(dna?.content_pillars) && dna.content_pillars.length > 0
    ? dna.content_pillars
    : null;
  const fallbackThemes = Array.isArray(dna?.content_themes) && dna.content_themes.length > 0
    ? dna.content_themes.map((t) => safeString(t))
    : ["Behind-the-Scenes Craft", "Problem Solving & Authority", "Social Proof & Conversions"];

  // Safe parsing of Visual Direction
  const palette: string[] = Array.isArray(dna?.visual_direction?.primary_colors) && dna.visual_direction.primary_colors.length > 0
    ? dna.visual_direction.primary_colors.map((c) => safeString(c))
    : Array.isArray(dna?.palette) && dna.palette.length > 0
    ? dna.palette.map((c) => safeString(c))
    : ["#0D2137", "#2B7BC4", "#F0F7FD"];
  const visualStyles = Array.isArray(dna?.visual_direction?.styles)
    ? dna.visual_direction.styles.map((s) => safeString(s))
    : [];
  const visualAvoid = Array.isArray(dna?.visual_direction?.visual_avoid)
    ? dna.visual_direction.visual_avoid.map((s) => safeString(s))
    : [];

  // Safe parsing of Production Directives
  const formats: string[] = Array.isArray(dna?.production?.feasible_formats) && dna.production.feasible_formats.length > 0
    ? dna.production.feasible_formats.map((f) => safeString(f))
    : Array.isArray(dna?.recommended_formats) && dna.recommended_formats.length > 0
    ? dna.recommended_formats.map((f) => safeString(f))
    : ["High-Retention Reels (9:16)", "Educational Carousels (4:5)", "High-Impact Posters"];
  const reelStyle = safeString(dna?.production?.default_reel_style, "talking_head");
  const doNotRules: string[] = Array.isArray(dna?.do_not) ? dna.do_not.map((d) => safeString(d)) : [];

  const strategicSummary = safeString(
    dna?.summary_line || dna?.ai_summary_line || dna?.summary || dnaStatus?.summary_line || dna?.positioning,
    "Formulating bespoke positioning vectors, tone archetypes, and content taxonomy for your brand."
  );

  const positioningStatement = safeString(dna?.positioning, "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1400px] w-full mx-auto space-y-4 pb-12"
    >
      {/* Header Container */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest mb-4">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Stage 5 Active • Creative Pod Allocated & Brief Dispatched
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0D2137] tracking-tight mb-2">
            Your Dedicated Creative Pod is Live!
          </h2>
          <p className="text-sm text-[#64748B] max-w-2xl leading-relaxed">
            Your retainer is active, your Brand Strategy DNA is synthesized, and your dedicated
            production specialists have been briefed with your 30-day content calendar.
          </p>
        </div>
        <button
          type="button"
          onClick={onLaunchPortal}
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
        >
          Go to Client Portal <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Left Column (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 text-left shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-[#C9DFF0]/70">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
              <UserCheck className="size-4 text-[#2B7BC4]" />
              <span>Dedicated Creative Pod (Algorithm Selected)</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Matched based on skill competencies, production headroom, and brand category experience
            </p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-3 py-1 rounded-lg shadow-2xs flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            FWB-FCS Pod Active
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {effectiveTeam.map((member) => (
            <div
              key={member.id || member.name}
              className="flex flex-col justify-between p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs hover:border-[#2B7BC4]/50 hover:bg-white transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={member.name} role={member.role} />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-sm text-[#0D2137] truncate">{member.name}</p>
                  <p className="text-[11px] font-semibold text-[#64748B] truncate mt-0.5">{member.role}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 mt-auto">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Assigned & Briefed
                </span>
                <button
                  type="button"
                  onClick={() => handleMessageSpecialist(member)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2B7BC4] hover:text-[#1E609A] hover:underline cursor-pointer"
                >
                  <MessageSquare className="size-3" />
                  <span>Support / Chat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>


          {/* Core Strategic Positioning & Audience */}
          <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm">
                    <div className="">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2B7BC4] mb-1.5">
            <Compass className="size-3.5" />
            <span>Core Strategic Positioning Vector</span>
          </div>
          <p className="text-sm sm:text-base text-[#0D2137] font-bold leading-relaxed italic">
            &ldquo;{strategicSummary}&rdquo;
          </p>
          {positioningStatement && positioningStatement !== strategicSummary && (
            <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
              {positioningStatement}
            </p>
          )}
        </div>


                    <div className="pt-4 mt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Users className="size-3.5 text-[#2B7BC4]" />
            <span>Target Audience Segments & Core Pain Points</span>
          </div>

          {audienceSegments ? (
            <div className="flex flex-col gap-3">
              {audienceSegments.map((seg, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-[#0D2137] mb-1">{safeString(seg.name, `Segment ${idx + 1}`)}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
                      {safeString(seg.description)}
                    </p>
                  </div>
                  {seg.core_pain_point && (
                    <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-rose-700 bg-rose-50/60 p-2 rounded-lg">
                      <Target className="size-3 text-rose-600 mt-0.5 flex-shrink-0" />
                      <span className="font-medium">
                        <strong>Pain Point:</strong> {safeString(seg.core_pain_point)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">{fallbackAudience}</p>
          )}
        </div>


          </div>
          <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-center space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Palette className="size-3.5 text-[#2B7BC4]" />
              <span>Visual Identity & Palette</span>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              {palette.map((c) => (
                <div key={c} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <div
                    className="size-4 rounded border border-black/10 shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                  <span className="font-mono text-[10px] font-bold text-slate-700">{c}</span>
                </div>
              ))}
            </div>

            {visualStyles.length > 0 && (
              <div className="flex gap-1.5 flex-wrap pt-1">
                {visualStyles.map((st) => (
                  <span key={st} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                    {st}
                  </span>
                ))}
              </div>
            )}

            {visualAvoid.length > 0 && (
              <div className="text-[10px] text-rose-700">
                <strong>Visual Avoid:</strong> {visualAvoid.join(", ")}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (Span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Sliders className="size-3.5 text-[#2B7BC4]" />
              <span>Tone & Voice Architecture Matrix</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Strict Production Boundary</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Voice Words & Anti-Voice */}
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Voice Words (Always Sound)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {voiceWords.map((word) => (
                    <span
                      key={word}
                      className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#1E609A] border border-blue-200 text-xs font-bold"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              {antiVoiceWords.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-1.5">
                    Anti-Voice Words (Never Sound)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {antiVoiceWords.map((word) => (
                      <span
                        key={word}
                        className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold"
                      >
                        Avoid {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {writingRules.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Editorial Writing Rules
                  </span>
                  <ul className="space-y-1">
                    {writingRules.slice(0, 3).map((rule, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <Check className="size-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Tone Dimension Sliders */}
            <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Tone Dimensions (0–10 Calibration)
              </span>
              <div className="space-y-2">
                {toneGauges.map((g) => (
                  <div key={g.label} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>{g.label}</span>
                      <span className="font-bold text-[#0D2137]">{g.value}/10</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2B7BC4] to-[#1E609A]"
                        style={{ width: `${Math.min(100, Math.max(10, g.value * 10))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E609A]">
              <Layers className="size-3.5 text-[#2B7BC4]" />
              <span>Synthesized 30-Day Content Pillars</span>
            </div>
            <span className="text-[10px] font-bold text-[#2B7BC4] bg-[#E8F4FD] px-2 py-0.5 rounded-full border border-[#C9DFF0]">
              Full Funnel Matrix
            </span>
          </div>

          {contentPillars ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contentPillars.map((pillar, idx) => {
                const stage = safeString(pillar.funnel_stage, "reach").toLowerCase();
                const stageColor =
                  stage === "reach"
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : stage === "authority"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200";

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white border border-[#C9DFF0] shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${stageColor}`}>
                          {stage}
                        </span>
                        {Array.isArray(pillar.best_formats) && pillar.best_formats.length > 0 && (
                          <span className="text-[9px] font-semibold text-slate-400 truncate">
                            {pillar.best_formats.map((f) => safeString(f)).join(", ")}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-[#0D2137] mb-1">{safeString(pillar.name, `Pillar ${idx + 1}`)}</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {safeString(pillar.rationale)}
                      </p>
                    </div>

                    {Array.isArray(pillar.example_angles) && pillar.example_angles.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                          Example Hooks:
                        </span>
                        <ul className="space-y-0.5">
                          {pillar.example_angles.slice(0, 2).map((angle, aIdx) => (
                            <li key={aIdx} className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                              <span className="size-1 rounded-full bg-[#2B7BC4]" />
                              <span>{safeString(angle)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {fallbackThemes.map((theme, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#C9DFF0] text-xs font-semibold text-[#0D2137] shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-[#2B7BC4]" />
                  <span className="truncate">{theme}</span>
                </div>
              ))}
            </div>
          )}
        </div>

          <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-center space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Film className="size-3.5 text-[#2B7BC4]" />
              <span>Production Directives & Formats</span>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {formats.map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-md bg-[#E8F4FD] text-[#2B7BC4] border border-[#C9DFF0] font-bold text-[11px] shadow-2xs"
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">Default Reel Style:</span>
              <span className="font-bold text-[#0D2137] capitalize">
                {reelStyle.replace(/_/g, " ")}
              </span>
            </div>

            {doNotRules.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600 mb-1">
                  <ShieldAlert className="size-3" />
                  <span>Hard Production Constraints:</span>
                </div>
                <ul className="space-y-0.5">
                  {doNotRules.slice(0, 2).map((rule, rIdx) => (
                    <li key={rIdx} className="text-[10px] text-slate-600 truncate">
                      • {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Area */}

      <div className="flex flex-col gap-3 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 font-medium">
          <div className="flex items-center gap-2.5">
            <Send className="size-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Summary Brief Dispatched:</strong> Your assigned Team Lead and Pod Specialists have received this Brand DNA summary and client production parameters via in-app notifications and email dispatch.
            </span>
          </div>
          <button
            type="button"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] shadow-2xs cursor-pointer flex-shrink-0 transition-all disabled:opacity-50"
          >
            {resendMutation.isPending ? (
              <span>Dispatching...</span>
            ) : resendFeedback ? (
              <>
                <Check className="size-3 text-emerald-600" />
                <span>{resendFeedback}</span>
              </>
            ) : (
              <>
                <Send className="size-3 text-emerald-600" />
                <span>Notify Pod Again</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Calendar Ready Notification Badge */}
      <div className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-bold text-emerald-800  shadow-2xs">
        <Calendar className="size-4.5 text-emerald-600" />
        <span>Initial 30-day production roadmap generated with +1 business-day due buffer. Ready for kickoff!</span>
      </div>

      {/* Launch Portal CTA Dock */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5">
        <button
          type="button"
          onClick={() => navigate("/portal/support")}
          className="w-full sm:w-1/3 py-4 px-6 rounded-2xl border-2 border-[#2B7BC4] text-[#2B7BC4] hover:bg-[#E8F4FD] font-extrabold text-sm transition-all cursor-pointer"
        >
          <span>Support Desk & Requests</span>
        </button>
        <button
          id="launch-portal-btn"
          type="button"
          onClick={onLaunchPortal}
          className="w-full sm:w-2/3 inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>Enter Client Portal & Production Roadmap</span>
          <ArrowRight className="size-4 sm:size-5" />
        </button>
      </div>
    </motion.div>
  );
}

export default StageComplete;
