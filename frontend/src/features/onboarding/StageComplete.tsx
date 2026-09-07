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
      className="max-w-2xl mx-auto rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-10 shadow-sm text-center"
    >
      {/* Celebration Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-5xl mb-3"
      >
        🚀
      </motion.div>

      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
        <CheckCircle2 className="size-3.5 text-emerald-600" />
        <span>Onboarding Complete • Pod Assigned</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0D2137] tracking-tight">
        Your Creative Pod is Live!
      </h2>

      <p className="text-xs sm:text-sm text-[#64748B] mt-2 mb-6 max-w-md mx-auto leading-relaxed">
        Your subscription is active, your Gemini Brand DNA has been formulated, and your dedicated production
        team has been algorithmically allocated with 30-day feasible calendar pacing.
      </p>

      {/* Algorithm-Assigned Creative Pod Card */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-gradient-to-br from-[#F8FAFC] to-[#F0F7FD] p-5 mb-5 text-left shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#C9DFF0]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#2B7BC4] flex items-center gap-1.5">
            <UserCheck className="size-3.5 text-[#2B7BC4]" />
            <span>Dedicated Creative Pod (Algorithm Selected)</span>
          </p>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
            FWB-FCS Matched
          </span>
        </div>

        <div className="space-y-3">
          {effectiveTeam.map((member) => (
            <div
              key={member.id || member.name}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#C9DFF0]/60 shadow-2xs hover:border-[#2B7BC4]/50 transition-colors"
            >
              <Avatar name={member.name} role={member.role} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs sm:text-sm text-[#0D2137] truncate">{member.name}</p>
                <p className="text-[11px] font-medium text-[#64748B] truncate">{member.role}</p>
              </div>
              <div className="ml-auto shrink-0">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Assigned
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand DNA Summary Recap */}
      {dna && (
        <div className="rounded-2xl border border-[#C9DFF0] bg-[#F8FAFC] p-5 mb-5 text-left shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#2B7BC4]" />
            <span>Formulated Brand DNA Recap</span>
          </p>

          <p className="text-xs sm:text-sm text-[#0D2137] font-semibold leading-relaxed mb-3">
            &ldquo;{dna.ai_summary_line ?? dna.summary}&rdquo;
          </p>

          <div className="flex gap-1.5 flex-wrap mb-3">
            {dna.recommended_formats.map((f) => (
              <span
                key={f}
                className="px-2.5 py-0.5 rounded-full bg-[#E8F4FD] text-[#2B7BC4] border border-[#C9DFF0] font-semibold text-[11px]"
              >
                {f}
              </span>
            ))}
          </div>

          {/* Colour palette */}
          <div className="flex gap-1.5 items-center">
            {dna.palette.map((c) => (
              <div
                key={c}
                title={c}
                className="size-6 rounded-md border border-black/10 shadow-2xs"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Calendar Ready Badge */}
      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs font-semibold text-[#1E609A] mb-6">
        <Calendar className="size-4 text-[#2B7BC4]" />
        <span>Initial 30-day production roadmap scheduled with 48h lead buffer.</span>
      </div>

      {/* Launch Portal CTA */}
      <button
        id="launch-portal-btn"
        type="button"
        onClick={onLaunchPortal}
        className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white font-bold text-sm sm:text-base shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
      >
        <span>Enter Client Portal & View Production Roadmap</span>
        <ArrowRight className="size-4" />
      </button>
    </motion.div>
  );
}

export default StageComplete;
