import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { fetchBrandDNAStatus } from "../../lib/onboarding-api";

interface StageCompleteProps {
  userId: string;
  onLaunchPortal: () => void;
}

const TEAM_MEMBERS = [
  { name: "Priya K.", role: "Account Manager", avatar: "PK", color: "#2B7BC4" },
  { name: "Arjun M.", role: "Lead Video Editor", avatar: "AM", color: "#065F46" },
  { name: "Sneha R.", role: "Motion Designer", avatar: "SR", color: "#D97706" },
];

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      style={{ backgroundColor: color }}
      className="size-10 rounded-full text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs ring-2 ring-white"
    >
      {initials}
    </div>
  );
}

export function StageComplete({ userId, onLaunchPortal }: StageCompleteProps) {
  const { data: dnaStatus } = useQuery({
    queryKey: ["brand-dna-status", userId],
    queryFn: () => fetchBrandDNAStatus(userId),
  });

  const dna = dnaStatus?.brand_dna;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-10 shadow-sm text-center"
    >
      {/* Confetti icon */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-5xl mb-4"
      >
        🎉
      </motion.div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
        <CheckCircle2 className="size-3.5 text-emerald-600" />
        <span>Onboarding Completed</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0D2137] tracking-tight">
        You&apos;re All Set!
      </h2>

      <p className="text-xs sm:text-sm text-[#64748B] mt-2 mb-6 max-w-md mx-auto leading-relaxed">
        Your account is active, your subscription is live, and your dedicated creative pod has been
        assigned.
      </p>

      {/* Brand DNA summary */}
      {dna && (
        <div className="rounded-2xl border border-[#C9DFF0] bg-[#F8FAFC] p-5 mb-5 text-left shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#2B7BC4]" />
            <span>Synthesized Brand DNA</span>
          </p>

          <p className="text-xs sm:text-sm text-[#0D2137] font-medium leading-relaxed mb-3">
            {dna.ai_summary_line ?? dna.summary}
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

      {/* Creative pod */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-[#F8FAFC] p-5 mb-6 text-left shadow-2xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
          Your Dedicated Creative Pod
        </p>
        <div className="space-y-3">
          {TEAM_MEMBERS.map((member) => (
            <div key={member.name} className="flex items-center gap-3">
              <Avatar initials={member.avatar} color={member.color} />
              <div>
                <p className="font-semibold text-xs text-[#0D2137]">{member.name}</p>
                <p className="text-[11px] text-[#64748B]">{member.role}</p>
              </div>
              <div className="ml-auto">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Assigned
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <button
        id="launch-portal-btn"
        type="button"
        onClick={onLaunchPortal}
        className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white font-bold text-sm sm:text-base shadow-md transition-all cursor-pointer"
      >
        <span>Open Client Portal</span>
        <ArrowRight className="size-4" />
      </button>
    </motion.div>
  );
}

export default StageComplete;
