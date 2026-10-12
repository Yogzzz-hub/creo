import { useState } from "react";
import { Link } from "react-router";
import {
  Lock,
  Zap,
  ArrowRight,
  PhoneCall,
} from "lucide-react";
import { ONBOARDING_TOTAL_STEPS, useOnboardingGate } from "../../lib/useOnboardingGate";
import { PlanBargainCallModal } from "./PlanBargainCallModal";

interface SubscriptionLockedStateProps {
  title?: string;
  description?: string;
  showResumeAction?: boolean;
}

export function SubscriptionLockedState({
  title,
  description,
  showResumeAction = true,
}: SubscriptionLockedStateProps) {
  const gate = useOnboardingGate();
  const { resume, isPaid, stage, completedSteps } = gate;

  // Resume destination and copy come from the shared onboarding gate
  let resumeRoute = resume.route;
  let resumeLabel = "Continue setup";
  const dynamicTitle = title || "Workspace Locked";
  let dynamicDescription = description || resume.description;
  let statusBadge = `Setup ${completedSteps}/${ONBOARDING_TOTAL_STEPS} · ${resume.action}`;
  let statusBadgeColor = "bg-[#D8BF9B]/10 text-[#D8BF9B] border-[#D8BF9B]/30";

  if (!isPaid) {
    if (gate.status?.checklist?.onboarding_completed) {
      // Onboarded before, but the retainer lapsed: renew from Plans & Billing
      resumeRoute = "/portal/payments";
      resumeLabel = "Renew retainer";
      statusBadge = "Retainer renewal required";
      if (!description) {
        dynamicDescription =
          "Renew your retainer to reactivate production.";
      }
    } else {
      statusBadge = "Plan not active yet";
      if (!description) {
        dynamicDescription =
          "Activate your plan to unlock this workspace.";
      }
    }
  } else if (stage >= 3) {
    statusBadge = "Payment received · Finish setup";
    statusBadgeColor = "bg-[#7FA0D6]/15 text-[#BCCCE6] border-[#7FA0D6]/30";
  }

  const [bargainModalOpen, setBargainModalOpen] = useState(false);

  return (
    <>
      <div className="portal-locked-card relative w-full overflow-hidden rounded-2xl border border-[#2A3446] bg-[#161F2D] p-3 sm:p-6 text-center shadow-2xl">
        {/* Ambient Subtle Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-[#7FA0D6]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-4">
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusBadgeColor} flex items-center gap-1.5`}>
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{statusBadge}</span>
          </div>

          {/* Title & Description */}
          <div className="space-y-2 max-w-lg">
            <h2 className="text-lg leading-tight sm:text-2xl font-black tracking-tight text-white">
              {dynamicTitle}
            </h2>
            <p className="text-sm sm:text-[15px] text-[#97A0B3] leading-relaxed">
              {dynamicDescription}
            </p>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex w-full flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {/* Primary Action: Resume Setup */}
            {showResumeAction && (
              <Link
                to={resumeRoute}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#BCCCE6] px-3 sm:px-6 py-3 text-sm font-bold text-[#0B111C] shadow-md hover:bg-white transition-all cursor-pointer"
              >
                <Zap className="size-4 text-[#0B111C]" />
                <span>{resumeLabel}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}

            {/* Negotiation & Bargain Button: Open PlanBargainCallModal */}
            <button
              type="button"
              onClick={() => setBargainModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#7FA0D6]/40 bg-[#7FA0D6]/10 px-5 py-3 text-sm font-semibold text-[#BCCCE6] cursor-pointer transition-colors enabled:hover:bg-[#293D58] enabled:hover:border-[#9CB8E5] enabled:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161F2D] shadow-sm"
            >
              <PhoneCall className="size-4" />
              <span>Call & Bargain</span>
            </button>

          </div>

        </div>
      </div>

      {/* Plan Bargain Call Modal */}
      <PlanBargainCallModal
        isOpen={bargainModalOpen}
        onClose={() => setBargainModalOpen(false)}
      />

    </>
  );
}
