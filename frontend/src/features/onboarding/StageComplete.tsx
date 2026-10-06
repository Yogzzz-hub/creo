import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, Check, Rocket, Send, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { fetchOnboardingStatus } from "../../lib/onboarding-api";
import type { AssignedTeamMember } from "../../types/api";

interface StageCompleteProps {
  userId: string;
  assignedTeam?: AssignedTeamMember[];
  onLaunchPortal: () => void;
}

function initials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, "")
    .split(" ")
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "CR";
}

const NEXT_STEPS = [
  {
    icon: Send,
    title: "Your team has been briefed",
    body: "Your answers were summarised into a production brief for your team lead and specialists.",
  },
  {
    icon: CalendarCheck,
    title: "30-day calendar drafted",
    body: "Your first month of reels, posts and stories is scheduled around your plan's quota.",
  },
  {
    icon: Rocket,
    title: "First batch in 7 days",
    body: "You'll review and approve every piece in the portal with one click.",
  },
];

/**
 * Step 5 — the client's workspace is live. The detailed Brand DNA brief goes to the
 * creative team; the client only needs to know who's on their pod and what's next.
 */
export function StageComplete({ userId, assignedTeam, onLaunchPortal }: StageCompleteProps) {
  const reduce = useReducedMotion();
  const { data: status } = useQuery({
    queryKey: ["onboarding-status", userId],
    queryFn: () => fetchOnboardingStatus(userId),
    enabled: !assignedTeam || assignedTeam.length === 0,
  });

  const rawTeam: AssignedTeamMember[] =
    assignedTeam && assignedTeam.length > 0 ? assignedTeam : (status?.assigned_team ?? []);
  // Team lead first, then editor, then designer
  const rank = (role: string) => (/lead/i.test(role) && !/editor|designer/i.test(role) ? 0 : /editor/i.test(role) ? 1 : 2);
  const team = [...rawTeam].sort((a, b) => rank(a.role) - rank(b.role));

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5 pb-6 sm:pb-8">
      {/* Success header */}
      <motion.section
        {...rise(0)}
        className="relative overflow-hidden rounded-2xl border border-[#2A3446] bg-[#161F2D] p-6 sm:p-8 text-center shadow-xl"
      >
        <div className="pointer-events-none absolute -top-28 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[#7FA0D6]/15 blur-3xl" />
        <motion.div
          initial={reduce ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
          className="relative mx-auto flex size-14 items-center justify-center rounded-full bg-[#7FA0D6] text-[#0B111C] shadow-[0_0_32px_rgba(127,160,214,0.55)]"
        >
          <Check className="size-7" strokeWidth={3} />
        </motion.div>
        <p className="relative mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7FA0D6]">
          Step 5 · Launch workspace
        </p>
        <h2 className="relative mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
          Your creative pod is ready
        </h2>
        <p className="relative mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#97A0B3]">
          Onboarding is complete. Your dedicated team is assigned and your production workspace is
          live.
        </p>
      </motion.section>

      {/* Pod */}
      <motion.section
        {...rise(0.12)}
        className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-5 sm:p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-4 text-[#7FA0D6]" />
          <h3 className="text-sm font-bold text-[#F8FAFC]">Your dedicated pod</h3>
        </div>
        {team.length === 0 ? (
          <p className="text-sm text-[#97A0B3]">
            Your team lead is finalising the pod — you'll see everyone in the portal shortly.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {team.map((member, i) => (
              <motion.li
                key={member.id || member.name}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.45 }}
                className="flex items-center gap-3 rounded-xl border border-[#2A3446] bg-[#0B111C] p-3.5"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-[#BCCCE6] text-[#0B111C]" : "bg-[#2A3446] text-[#F8FAFC]"
                  }`}
                >
                  {initials(member.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#F8FAFC]">{member.name}</p>
                  <p className="text-xs leading-snug text-[#97A0B3]">{member.role.replace(/\s*\(.*\)\s*/, "")}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>

      {/* What happens next */}
      <motion.section
        {...rise(0.22)}
        className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-5 sm:p-6 shadow-xl"
      >
        <h3 className="mb-4 text-sm font-bold text-[#F8FAFC]">What happens next</h3>
        <ol className="space-y-3">
          {NEXT_STEPS.map((stepItem) => {
            const Icon = stepItem.icon;
            return (
              <li key={stepItem.title} className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#7FA0D6]/30 bg-[#7FA0D6]/10 text-[#7FA0D6]">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#F8FAFC]">{stepItem.title}</p>
                  <p className="text-[13px] leading-relaxed text-[#97A0B3]">{stepItem.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </motion.section>

      <motion.div {...rise(0.3)} className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onLaunchPortal}
          className="group inline-flex items-center gap-2 rounded-xl bg-[#BCCCE6] px-7 py-3.5 text-sm font-bold text-[#0B111C] shadow-[0_12px_30px_-12px_rgba(188,204,230,0.6)] transition-colors hover:bg-white"
        >
          Launch my portal
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}

export default StageComplete;
