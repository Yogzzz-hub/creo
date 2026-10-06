import { ArrowRight, Check, LifeBuoy, PhoneCall, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
  useOnboardingGate,
} from "../../lib/useOnboardingGate";
import { PlanBargainCallModal } from "./PlanBargainCallModal";

interface ResumeOnboardingBannerProps {
  /** "compact" is the slim strip shown on top of every portal page; "hero" is the dashboard card */
  variant?: "compact" | "hero";
  /** Optional headline for the hero card */
  title?: string;
}

function StepSegments({ completed, current }: { completed: number; current: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {ONBOARDING_STEPS.map((s) => (
        <span
          key={s.step}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
            s.step <= completed
              ? "bg-[#7FA0D6]"
              : s.step === current
                ? "bg-[#D8BF9B]"
                : "bg-[#2A3446]"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Shows clients who have not finished onboarding exactly where to pick up again.
 * Renders nothing for staff or fully onboarded clients.
 */
export function ResumeOnboardingBanner({
  variant = "compact",
  title,
}: ResumeOnboardingBannerProps) {
  const gate = useOnboardingGate();
  const [bargainOpen, setBargainOpen] = useState(false);

  if (!gate.isClient || !gate.isReady || gate.isComplete) return null;

  const { resume, completedSteps, currentStep, isPaid } = gate;
  const progressLabel = `${completedSteps} of ${ONBOARDING_TOTAL_STEPS} steps done`;

  if (variant === "compact") {
    return (
      <section
        aria-label="Resume onboarding"
        className="mb-6 rounded-2xl border border-[#D8BF9B]/25 bg-[#161F2D] px-4 py-3.5 sm:px-5 shadow-[0_4px_20px_rgba(5,8,16,0.35)] animate-page-in"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#D8BF9B]/30 bg-[#D8BF9B]/10">
              <Sparkles className="size-[18px] text-[#D8BF9B]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-[#F8FAFC]">
                Finish setting up your workspace
                <span className="block text-xs font-medium text-[#97A0B3] sm:ml-1.5 sm:inline sm:text-sm sm:font-normal">
                  <span className="hidden sm:inline">· </span>
                  {progressLabel}
                </span>
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#97A0B3]">
                Next:{" "}
                <span className="font-medium text-[#BCCCE6]">
                  Step {resume.step} — {resume.action}
                </span>
              </p>
              <div className="mt-2.5 max-w-sm">
                <StepSegments completed={completedSteps} current={currentStep} />
              </div>
            </div>
          </div>
          <Link
            to={resume.route}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#BCCCE6] px-5 py-2.5 text-sm font-bold text-[#0B111C] shadow-sm transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B111C]"
          >
            Resume setup
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        aria-label="Resume onboarding"
        className="relative overflow-hidden rounded-3xl border border-[#D8BF9B]/25 bg-[#161F2D] p-5 sm:p-7 shadow-[0_8px_32px_rgba(5,8,16,0.45)] animate-page-in"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#7FA0D6]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-2xl flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8BF9B]/30 bg-[#D8BF9B]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#D8BF9B]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#D8BF9B]" />
              Setup incomplete · {progressLabel}
            </span>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-[#F8FAFC] sm:text-2xl">
              {title ?? "Your production pipeline starts once setup is done"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#97A0B3]">{resume.description}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to={resume.route}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BCCCE6] px-5 py-3 text-sm font-bold text-[#0B111C] shadow-md transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161F2D]"
              >
                Resume: {resume.action}
                <ArrowRight className="size-4" />
              </Link>
              {!isPaid && (
                <button
                  type="button"
                  onClick={() => setBargainOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#7FA0D6]/40 bg-[#7FA0D6]/10 px-5 py-3 text-sm font-semibold text-[#BCCCE6] transition-colors hover:bg-[#7FA0D6]/20"
                >
                  <PhoneCall className="size-4" />
                  Call & bargain a custom plan
                </button>
              )}
              <Link
                to="/portal/support"
                className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-medium text-[#97A0B3] transition-colors hover:text-[#F8FAFC]"
              >
                <LifeBuoy className="size-4" />
                Need help?
              </Link>
            </div>
          </div>

          {/* Step tracker */}
          <ol className="grid w-full grid-cols-5 gap-2 lg:max-w-md">
            {ONBOARDING_STEPS.map((s) => {
              const done = s.step <= completedSteps;
              const current = s.step === currentStep;
              return (
                <li key={s.step} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      done
                        ? "bg-[#7FA0D6] text-[#0B111C]"
                        : current
                          ? "bg-[#D8BF9B] text-[#0B111C] ring-4 ring-[#D8BF9B]/20"
                          : "border border-[#2A3446] bg-[#0B111C] text-[#97A0B3]"
                    }`}
                  >
                    {done ? <Check className="size-4" strokeWidth={3} /> : s.step}
                  </span>
                  <span
                    className={`text-[11px] font-medium leading-tight sm:text-xs ${
                      current ? "text-[#F8FAFC]" : done ? "text-[#BCCCE6]" : "text-[#97A0B3]"
                    }`}
                  >
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <PlanBargainCallModal isOpen={bargainOpen} onClose={() => setBargainOpen(false)} />
    </>
  );
}

export default ResumeOnboardingBanner;
