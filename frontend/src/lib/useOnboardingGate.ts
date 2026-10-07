import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { OnboardingStatus } from "../types/api";
import { useAuth } from "./auth-context";
import { fetchOnboardingStatus } from "./onboarding-api";

export const ONBOARDING_STEPS = [
  { step: 1, label: "Verify email", short: "Verify" },
  { step: 2, label: "Sign agreement", short: "Terms" },
  { step: 3, label: "Choose plan", short: "Plan" },
  { step: 4, label: "Brand questionnaire", short: "Brand" },
  { step: 5, label: "Launch workspace", short: "Launch" },
] as const;

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length;

export interface ResumeTarget {
  /** Onboarding step (1-5) the client should continue from */
  step: number;
  route: string;
  /** Button label, e.g. "Choose your plan" */
  action: string;
  /** One-line explanation of what is pending */
  description: string;
}

/** Stage 8 means fully onboarded; 4-7 are finalisation stages that resume in the questionnaire. */
export function stageToStep(stage: number): number {
  if (stage <= 0) return 1;
  if (stage === 1) return 2;
  if (stage === 2) return 3;
  if (stage <= 7) return 4;
  return 5;
}

export function getResumeTarget(stage: number): ResumeTarget {
  if (stage <= 0) {
    return {
      step: 1,
      route: "/onboarding?step=1",
      action: "Verify your email",
      description: "Confirm your email address to start setting up your workspace.",
    };
  }
  if (stage === 1) {
    return {
      step: 2,
      route: "/onboarding?step=2",
      action: "Sign the service agreement",
      description: "Review and accept the Master Service Agreement to unlock plan selection.",
    };
  }
  if (stage === 2) {
    return {
      step: 3,
      route: "/onboarding?step=3",
      action: "Choose your plan",
      description: "Pick a production plan to activate your creative pod and content pipeline.",
    };
  }
  if (stage === 3) {
    return {
      step: 4,
      route: "/onboarding?step=4",
      action: "Complete brand questionnaire",
      description: "Payment received. Tell us about your brand so we can build your Brand DNA.",
    };
  }
  return {
    step: 4,
    route: "/onboarding?step=4",
    action: "Finalize & launch workspace",
    description: "Your answers are saved. Generate your Brand DNA to assign your pod and calendar.",
  };
}

/**
 * Single source of truth for "is this client allowed into the production portal?".
 *
 * Reads /onboarding/status (shared React Query cache with the onboarding flow) and
 * falls back to the stage returned by /auth/me so pages can decide instantly on
 * first render instead of waiting for another request.
 */
export function useOnboardingGate() {
  const { user, patchUser } = useAuth();
  const isClient = user?.role === "client";

  const { data: status, isFetching, error, refetch } = useQuery<OnboardingStatus>({
    queryKey: ["onboarding-status", user?.id],
    queryFn: () => fetchOnboardingStatus(user?.id || ""),
    enabled: !!user?.id && isClient,
    staleTime: 30_000,
    retry: false,
  });

  // Keep the cached auth profile in sync so the next page load starts from the right stage
  useEffect(() => {
    if (status && user && status.stage !== user.onboarding_stage) {
      patchUser({ onboarding_stage: status.stage });
    }
  }, [status, user, patchUser]);

  const knownStage =
    status?.stage ?? (typeof user?.onboarding_stage === "number" ? user.onboarding_stage : null);
  const stage = knownStage ?? 0;
  const isComplete = !isClient || Boolean(status?.is_complete) || stage >= 8;

  return {
    error: knownStage === null ? error : null,
    refetch,
    isClient,
    /** False only while a client's stage is completely unknown */
    isReady: !isClient || knownStage !== null,
    isRefreshing: isFetching,
    isComplete,
    isPaid: !isClient || stage >= 3,
    stage,
    currentStep: stageToStep(stage),
    completedSteps: isComplete ? ONBOARDING_TOTAL_STEPS : stageToStep(stage) - 1,
    resume: getResumeTarget(stage),
    status,
  };
}

export type OnboardingGate = ReturnType<typeof useOnboardingGate>;
