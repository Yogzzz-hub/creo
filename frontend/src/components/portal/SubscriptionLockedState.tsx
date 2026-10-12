import { useState } from "react";
import { Link } from "react-router";
import {
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
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
  let resumeLabel = `Step ${resume.step}: ${resume.action}`;
  const dynamicTitle = title || "Production Workspace Locked";
  let dynamicDescription = description || resume.description;
  let statusBadge = `Setup ${completedSteps}/${ONBOARDING_TOTAL_STEPS} · ${resume.action}`;
  let statusBadgeColor = "bg-[#D8BF9B]/10 text-[#D8BF9B] border-[#D8BF9B]/30";

  if (!isPaid) {
    if (gate.status?.checklist?.onboarding_completed) {
      // Onboarded before, but the retainer lapsed: renew from Plans & Billing
      resumeRoute = "/portal/payments";
      resumeLabel = "Renew retainer in Plans & Billing";
      statusBadge = "Retainer renewal required";
      if (!description) {
        dynamicDescription =
          "Your creative retainer is expired or awaiting renewal. Renew in Plans & Billing or contact your pod to reactivate production.";
      }
    } else {
      statusBadge = "Plan not active yet";
      if (!description) {
        dynamicDescription =
          "An active creative retainer is required to activate your dedicated creative pod. Choose a plan or book a call to set custom rates.";
      }
    }
  } else if (stage >= 3) {
    statusBadge = "Payment received · Finish setup";
    statusBadgeColor = "bg-[#7FA0D6]/15 text-[#BCCCE6] border-[#7FA0D6]/30";
  }

  const [bargainModalOpen, setBargainModalOpen] = useState(false);

  return (
    <>
      <div className="portal-locked-card relative w-full overflow-hidden rounded-2xl border border-[#2A3446] bg-[#161F2D] p-5 sm:p-6 text-center shadow-2xl">
        {/* Ambient Subtle Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-[#7FA0D6]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center space-y-4">
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusBadgeColor} flex items-center gap-1.5`}>
            <span className="size-1.5 rounded-full bg-current animate-pulse" />
            <span>{statusBadge}</span>
          </div>

          {/* Lock Icon Badge */}
          <div className="relative flex size-18 items-center justify-center rounded-3xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] shadow-xl">
            <Lock className="size-8" />
            <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-[#BCCCE6] text-[#0B111C] shadow-sm border-2 border-[#161F2D]">
              <ShieldAlert className="size-3.5" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2 max-w-lg">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {dynamicTitle}
            </h2>
            <p className="text-sm sm:text-[15px] text-[#97A0B3] leading-relaxed">
              {dynamicDescription}
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-1">
            <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CheckCircle2 className="size-4 text-[#7FA0D6] shrink-0" />
                <span>Dedicated Squad</span>
              </div>
              <p className="text-[13px] text-[#97A0B3] mt-1.5 leading-relaxed">
                Direct creative specialists, editors, and lead producers dedicated to your brand.
              </p>
            </div>

            <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CheckCircle2 className="size-4 text-[#7FA0D6] shrink-0" />
                <span>Guaranteed Cadence</span>
              </div>
              <p className="text-[13px] text-[#97A0B3] mt-1.5 leading-relaxed">
                Monthly quotas of 9:16 video reels, carousel sets, and brand graphics.
              </p>
            </div>

            <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CheckCircle2 className="size-4 text-[#7FA0D6] shrink-0" />
                <span>Publishing Calendar</span>
              </div>
              <p className="text-[13px] text-[#97A0B3] mt-1.5 leading-relaxed">
                30-day auto-publishing schedule with instant review and sign-off docks.
              </p>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            {/* Primary Action: Resume Setup */}
            {showResumeAction && (
              <Link
                to={resumeRoute}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#BCCCE6] px-6 py-3 text-sm font-bold text-[#0B111C] shadow-md hover:bg-white transition-all cursor-pointer"
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#7FA0D6]/40 bg-[#7FA0D6]/10 px-5 py-3 text-sm font-semibold text-[#BCCCE6] hover:bg-[#7FA0D6]/20 transition-all cursor-pointer shadow-sm"
            >
              <PhoneCall className="size-4" />
              <span>Call & Bargain / Custom Retainer</span>
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
