import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, CheckCircle2, Calendar, UserCheck } from "lucide-react";
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


function Avatar({ name, role }: { name: string; role: string }) {
  const initials = getInitials(name);
  const styling = ROLE_COLORS[role] || { bg: "#475569", text: "#FFFFFF", ring: "#CBD5E1" };

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl lg:max-w-5xl w-full mx-auto rounded-3xl border border-[#C9DFF0] bg-gradient-to-b from-white via-[#F8FAFC] to-[#F0F7FD] p-6 sm:p-10 lg:p-12 shadow-xl text-center relative overflow-hidden"
    >
      {/* Ambient Glow Effects */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-0 size-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Celebration Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="size-16 sm:size-20 rounded-3xl bg-gradient-to-tr from-[#0D2137] to-[#2B7BC4] flex items-center justify-center mx-auto mb-4 text-3xl sm:text-4xl shadow-lg shadow-blue-500/20 text-white"
      >
        🚀
      </motion.div>

      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-3 shadow-xs">
        <CheckCircle2 className="size-4 text-emerald-600" />
        <span>Onboarding Complete • Pod Assigned</span>
      </div>

      <h2 className="text-2xl sm:text-4xl font-black font-display text-[#0D2137] tracking-tight">
        Your Dedicated Creative Pod is Live!
      </h2>

      <p className="text-sm sm:text-base text-[#64748B] mt-2 mb-8 max-w-2xl mx-auto leading-relaxed">
        Your subscription is active, your Brand Strategy DNA has been formulated, and your dedicated production
        team has been algorithmically allocated with 30-day feasible calendar pacing.
      </p>

      {/* Algorithm-Assigned Creative Pod Card */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 mb-6 text-left shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#C9DFF0]/70">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-2">
            <UserCheck className="size-4 text-[#2B7BC4]" />
            <span>Dedicated Creative Pod (Algorithm Selected)</span>
          </p>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-3 py-1 rounded-lg shadow-2xs">
            FWB-FCS Matched
          </span>
        </div>

        <div className="space-y-3">
          {effectiveTeam.map((member) => (
            <div
              key={member.id || member.name}
              className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 shadow-2xs hover:border-[#2B7BC4]/50 hover:bg-white transition-all"
            >
              <Avatar name={member.name} role={member.role} />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-sm sm:text-base text-[#0D2137] truncate">{member.name}</p>
                <p className="text-xs font-semibold text-[#64748B] truncate mt-0.5">{member.role}</p>
              </div>
              <div className="ml-auto shrink-0">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Assigned
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand DNA Summary Recap */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 mb-6 text-left shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-[#2B7BC4]" />
          <span>Formulated Brand DNA Summary & Intake Recap</span>
        </p>

        <p className="text-sm sm:text-base text-[#0D2137] font-bold leading-relaxed mb-4 p-4 rounded-xl bg-[#F0F7FD] border border-[#C9DFF0]/60">
          &ldquo;{dna?.ai_summary_line || dna?.summary || "Formulating bespoke positioning vectors, tone archetypes, and content taxonomy for your brand."}&rdquo;
        </p>

        {dna?.recommended_formats && dna.recommended_formats.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {dna.recommended_formats.map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full bg-[#E8F4FD] text-[#2B7BC4] border border-[#C9DFF0] font-bold text-xs shadow-2xs"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Colour palette */}
        {dna?.palette && dna.palette.length > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-xs font-semibold text-slate-500 mr-1">Brand Palette:</span>
            {dna.palette.map((c) => (
              <div
                key={c}
                title={c}
                className="size-7 rounded-lg border border-black/10 shadow-xs transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Calendar Ready Badge */}
      <div className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-blue-50/80 border border-blue-100 text-xs sm:text-sm font-bold text-[#1E609A] mb-8 shadow-2xs">
        <Calendar className="size-4.5 text-[#2B7BC4]" />
        <span>Initial 30-day production roadmap scheduled with 48h lead buffer.</span>
      </div>

      {/* Launch Portal CTA */}
      <button
        id="launch-portal-btn"
        type="button"
        onClick={onLaunchPortal}
        className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:brightness-110 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer"
      >
        <span>Enter Client Portal & View Production Roadmap</span>
        <ArrowRight className="size-4 sm:size-5" />
      </button>
    </motion.div>
  );
}

export default StageComplete;
