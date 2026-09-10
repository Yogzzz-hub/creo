import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  UserCheck,
  Target,
  Users,
  MessageSquare,
  Layers,
  Palette,
  Film,
  Compass,
} from "lucide-react";
import { fetchBrandDNAStatus, fetchOnboardingStatus } from "../../lib/onboarding-api";
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

export function StageComplete({ userId, assignedTeam, onLaunchPortal }: StageCompleteProps) {
  const navigate = useNavigate();

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl lg:max-w-5xl w-full mx-auto rounded-3xl border border-[#C9DFF0] bg-gradient-to-b from-white via-[#F8FAFC] to-[#F0F7FD] p-6 sm:p-10 lg:p-12 shadow-xl text-center relative overflow-hidden"
    >
      {/* Onboarding Complete Header Badge */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-extrabold uppercase tracking-wider mb-4 shadow-xs"
      >
        <CheckCircle2 className="size-4.5 text-emerald-600" />
        <span>Stage 5 Active • Dedicated Creative Pod Allocated</span>
      </motion.div>

      <h2 className="text-2xl sm:text-4xl font-black font-display text-[#0D2137] tracking-tight">
        Your Dedicated Creative Pod is Live!
      </h2>

      <p className="text-sm sm:text-base text-[#64748B] mt-2 mb-8 max-w-2xl mx-auto leading-relaxed">
        Your retainer is active, your Brand Strategy DNA has been synthesized by Gemini AI, and your dedicated
        production specialists have been allocated to execute your 30-day content calendar.
      </p>

      {/* ── Algorithm-Assigned Creative Pod Card ────────────────────────────── */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 mb-8 text-left shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#C9DFF0]/70">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
              <UserCheck className="size-4 text-[#2B7BC4]" />
              <span>Dedicated Creative Pod (Algorithm Selected)</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Matched based on skill competencies, production headroom, and category experience
            </p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-3 py-1 rounded-lg shadow-2xs">
            FWB-FCS Pod Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  Assigned
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

      {/* ── Gemini AI Brand Strategy DNA Response ─────────────────────────── */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-7 mb-8 text-left shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#C9DFF0]/70">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#0D2137] flex items-center gap-2">
            <Sparkles className="size-4 text-[#2B7BC4] animate-pulse" />
            <span>Gemini AI Strategic Brand Analyser Output</span>
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2B7BC4] bg-[#E8F4FD] border border-[#C9DFF0] px-2.5 py-0.5 rounded-full">
            Gemini 1.5 Flash
          </span>
        </div>

        {/* Strategic Positioning Line */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F0F7FD] via-white to-[#F0F7FD] border border-[#C9DFF0]/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2B7BC4] mb-1.5">
            <Compass className="size-3.5" />
            <span>Core Strategic Positioning Vector</span>
          </div>
          <p className="text-sm sm:text-base text-[#0D2137] font-bold leading-relaxed italic">
            &ldquo;{dna?.ai_summary_line || dna?.summary || "Formulating bespoke positioning vectors, tone archetypes, and content taxonomy for your brand."}&rdquo;
          </p>
        </div>

        {/* 2-Column Strategy Detail Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Target Audience & Persona */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Users className="size-3.5 text-[#2B7BC4]" />
              <span>Target Audience Persona</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {dna?.audience_persona || dna?.target_audience || "Engaged modern digital consumers seeking elevated, transparent brand experiences."}
            </p>
            {dna?.tone && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-400">Tone Profile:</span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {dna.tone}
                </span>
              </div>
            )}
          </div>

          {/* Strategic Business Goal Alignment */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Target className="size-3.5 text-emerald-600" />
              <span>Business Goal Alignment</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {dna?.goal_alignment || "Combining high-impact short-form video with authoritative carousels to maximize engagement and customer conversion."}
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-400">Cadence:</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Daily Business Day Production
              </span>
            </div>
          </div>
        </div>

        {/* 30-Day Content Themes / Pillars */}
        {dna?.content_themes && Array.isArray(dna.content_themes) && dna.content_themes.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50/40 border border-blue-100">
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold uppercase tracking-wider text-[#1E609A]">
              <Layers className="size-3.5 text-[#2B7BC4]" />
              <span>Synthesized 30-Day Content Pillars</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dna.content_themes.map((theme, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#C9DFF0] text-xs font-semibold text-[#0D2137] shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-[#2B7BC4]" />
                  <span className="truncate">{theme}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formats & Brand Palette Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200/80">
          {/* Recommended Formats */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Film className="size-3 text-[#2B7BC4]" />
              <span>Recommended Production Formats:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(dna?.recommended_formats || ["High-Retention Reels (9:16)", "Educational Carousels (4:5)"]).map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-md bg-[#E8F4FD] text-[#2B7BC4] border border-[#C9DFF0] font-bold text-xs shadow-2xs"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Colour Palette */}
          {dna?.palette && Array.isArray(dna.palette) && dna.palette.length > 0 && (
            <div className="space-y-1.5 sm:text-right">
              <div className="flex items-center sm:justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Palette className="size-3 text-[#2B7BC4]" />
                <span>Brand Palette:</span>
              </div>
              <div className="flex gap-1.5 items-center sm:justify-end">
                {dna.palette.map((c) => (
                  <div
                    key={c}
                    title={c}
                    className="size-7 rounded-lg border border-black/10 shadow-xs transition-transform hover:scale-110 flex items-center justify-center font-mono text-[8px] text-white/90"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Ready Notification Badge */}
      <div className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-bold text-emerald-800 mb-8 shadow-2xs">
        <Calendar className="size-4.5 text-emerald-600" />
        <span>Initial 30-day production roadmap generated with +3 business-day due buffer. Ready for kickoff!</span>
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

