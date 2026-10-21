import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, Mail, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { acceptTerms, fetchOnboardingStatus } from "../../lib/onboarding-api";
import { useAuth } from "../../lib/auth-context";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";
import { ONBOARDING_STEPS } from "../../lib/useOnboardingGate";
const StageComplete = lazy(() => import("./StageComplete").then(module => ({ default: module.StageComplete })));
const StagePayment = lazy(() => import("./StagePayment").then(module => ({ default: module.StagePayment })));
const StageQuestionnaire = lazy(() => import("./StageQuestionnaire").then(module => ({ default: module.StageQuestionnaire })));
const StageTerms = lazy(() => import("./StageTerms").then(module => ({ default: module.StageTerms })));
import { OtpPinInput } from "../../components/ui/OtpPinInput";
import type { AssignedTeamMember, OnboardingStatus } from "../../types/api";

interface OnboardingViewProps {
  userId: string;
  onPortalLaunch?: () => void;
}

// Same step names as the portal's resume banner so the wording matches everywhere
const STAGES = ONBOARDING_STEPS;

function ProgressStepper({
  activeStep,
  maxUnlockedStep,
  onSelectStep,
}: {
  activeStep: number;
  maxUnlockedStep: number;
  onSelectStep?: (step: number) => void;
}) {
  return (
    <div className="w-full mb-5 sm:mb-6">
      {/* Stepper Card */}
      <div className="relative bg-app-surface rounded-2xl shadow-xl border border-app-line px-3 sm:px-8 py-4 sm:py-5">
        {/* Track Row — guaranteed center alignment between lines and circles */}
        <div className="relative flex items-center justify-between w-full h-9 mb-3">
          {/* Background track line */}
          <div
            className="absolute left-[10%] right-[10%] h-[2px] rounded-full bg-app-line top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />

          {/* Completed track line */}
          <div
            className="absolute left-[10%] h-[2px] rounded-full transition-all duration-500 bg-app-accent top-1/2 -translate-y-1/2"
            aria-hidden="true"
            style={{
              width: `${Math.max(0, Math.min(1, (maxUnlockedStep - 1) / (STAGES.length - 1))) * 80}%`,
            }}
          />

          {/* Circles */}
          {STAGES.map((s) => {
            const isDone = s.step < maxUnlockedStep;
            const isActive = s.step === activeStep;
            const isUnlocked = s.step <= maxUnlockedStep;

            return (
              <div key={s.step} className="flex-1 flex justify-center relative z-10">
                <button
                  type="button"
                  onClick={() => isUnlocked && onSelectStep?.(s.step)}
                  disabled={!isUnlocked}
                  className={`size-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 select-none ${
                    isDone
                      ? "bg-app-accent text-app-base shadow-sm hover:scale-105 cursor-pointer"
                      : isActive
                      ? "bg-app-accent-soft text-app-base font-black ring-4 ring-app-accent-soft/25 shadow-md hover:scale-105 cursor-pointer"
                      : isUnlocked
                      ? "bg-app-base text-app-mist border border-app-line hover:border-app-accent/60 hover:text-white cursor-pointer"
                      : "bg-app-base text-app-mist/50 border border-app-line/50 cursor-not-allowed"
                  }`}
                  aria-label={`Step ${s.step}: ${s.label}`}
                >
                  {isDone ? (
                    <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{s.step}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Labels row */}
        <div className="flex items-start justify-between w-full">
          {STAGES.map((s) => {
            const isDone = s.step < maxUnlockedStep;
            const isActive = s.step === activeStep;
            const isUnlocked = s.step <= maxUnlockedStep;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => isUnlocked && onSelectStep?.(s.step)}
                disabled={!isUnlocked}
                className={`flex-1 text-center px-1 focus:outline-none transition-opacity ${
                  isUnlocked ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                }`}
              >
                <p
                  className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-0.5 ${
                    isActive ? "text-app-accent-soft" : isDone ? "text-app-accent" : "text-app-mist"
                  }`}
                >
                  Step {s.step}
                </p>
                <p
                  className={`text-xs sm:text-sm font-semibold transition-colors truncate px-0.5 ${
                    isActive
                      ? "text-hi font-bold"
                      : isDone
                      ? "text-app-accent-soft"
                      : "text-app-mist"
                  }`}
                >
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StageVerifyEmail({
  userEmail,
  isAlreadyVerified,
  onVerified,
  onContinueToTerms,
}: {
  userEmail?: string;
  isAlreadyVerified: boolean;
  onVerified: () => void;
  onContinueToTerms: () => void;
}) {
  const { sendOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState(userEmail || "");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(isAlreadyVerified);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await sendOtp(email);
      setOtpSent(true);
      setMessage({ type: "success", text: `Verification code sent to ${email}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send verification code.";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent, explicitCode?: string) => {
    if (e) e.preventDefault();
    const codeToVerify = explicitCode || otpCode;
    if (!codeToVerify || codeToVerify.length < 4) {
      setMessage({ type: "error", text: "Please enter the 6-digit OTP received in your inbox." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await verifyOtp(email, codeToVerify);
      onVerified();
      setVerifiedSuccess(true);
      setMessage({ type: "success", text: "Email verified successfully!" });
      setTimeout(onContinueToTerms, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid or expired verification code.";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="w-full max-w-xl mx-auto rounded-xl border border-app-line bg-app-surface p-5 sm:p-8 shadow-xl text-center"
    >
      <div className="size-14 mx-auto mb-4 rounded-2xl bg-app-base border border-app-line flex items-center justify-center text-app-accent">
        {verifiedSuccess ? (
          <ShieldCheck className="size-7 text-emerald-400" />
        ) : (
          <Mail className="size-7 text-app-accent" />
        )}
      </div>

      <h2 className="text-xl sm:text-2xl font-bold font-display text-app-ink tracking-tight">
        {verifiedSuccess ? "Email Verified" : "Verify Your Email"}
      </h2>
      <p className="text-sm text-app-mist mt-2 max-w-md mx-auto leading-relaxed">
        {verifiedSuccess
          ? "Your email address has been confirmed. You can now proceed to review and sign the Master Service Agreement."
          : "We protect your agency workspace with fast email verification. Enter your email to receive a 6-digit code."}
      </p>

      {message && (
        <div
          className={`mt-4 p-3 rounded-xl text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
              : "bg-rose-950/40 text-rose-300 border border-rose-800/60"
          }`}
        >
          {message.text}
        </div>
      )}

      {verifiedSuccess ? (
        <div className="mt-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>Verified: {userEmail || email || "Active Client"}</span>
          </div>

          <div>
            <button
              type="button"
              onClick={onContinueToTerms}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-app-accent-soft text-app-base font-bold text-sm hover:bg-hi shadow-sm transition-all cursor-pointer"
            >
              <span>Continue to Master Service Agreement (Step 2)</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 text-left max-w-md mx-auto">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-app-ink mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-app-line bg-app-base text-sm text-app-ink placeholder-app-mist/50 focus:outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-app-accent-soft text-app-base font-bold text-sm hover:bg-hi shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading && <RefreshCw className="size-4 animate-spin" />}
                <span>Send Verification Code</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-app-mist">
                    Enter 6-Digit Security Code
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-xs font-semibold text-app-accent hover:text-app-accent-soft transition-colors"
                  >
                    Resend Code
                  </button>
                </div>
                <OtpPinInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(code) => handleVerifyOtp(undefined, code)}
                  disabled={loading}
                  hasError={Boolean(message && message.type === "error")}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 4}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-app-accent-soft text-app-base font-bold text-sm hover:bg-hi shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading && <RefreshCw className="size-4 animate-spin" />}
                <span>Verify Code & Continue</span>
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-app-line text-center">
            <button
              type="button"
              onClick={onContinueToTerms}
              className="text-xs text-app-mist hover:text-hi underline transition-colors"
            >
              Skip verification for now and proceed to Terms →
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function OnboardingView({ userId, onPortalLaunch }: OnboardingViewProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [termsSubmitting, setTermsSubmitting] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [assignedTeam, setAssignedTeam] = useState<AssignedTeamMember[] | undefined>(undefined);

  const requestedStepParam = searchParams.get("step");
  const requestedStep = requestedStepParam ? parseInt(requestedStepParam, 10) : null;

  const statusKey = ["onboarding-status", userId];
  const {
    data: status,
    isLoading,
    isError,
  } = useQuery({
    queryKey: statusKey,
    queryFn: () => fetchOnboardingStatus(userId),
    // No polling: every step updates the cache itself after its request succeeds.
    // Refetch on focus still picks up changes made in another tab (e.g. a payment).
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  /**
   * Record that the server accepted a step so the stepper advances immediately,
   * then confirm the authoritative stage in the background.
   */
  const markStageReached = (minStage: number) => {
    queryClient.setQueryData<OnboardingStatus>(statusKey, (prev) =>
      prev && prev.stage < minStage ? { ...prev, stage: minStage, is_complete: minStage >= 8 } : prev,
    );
    void queryClient.invalidateQueries({ queryKey: statusKey });
  };

  // Calculate user's current unlocked step (1 to 5) strictly from database stage:
  // stage 0 -> step 1 (Email verification pending)
  // stage 1 -> step 2 (Email verified, terms pending)
  // stage 2 -> step 3 (Terms accepted, payment pending)
  // stage 3 -> step 4 (Payment done, questionnaire core pending)
  // stage 4..8 -> step 5 (Questionnaire complete -> Creative Pod, Brand DNA & Activation)
  // Until the status request lands, the stage from /auth/me lets us render the right step right away
  const backendStage = status?.stage ?? user?.onboarding_stage ?? 0;
  const hasStage = status !== undefined || typeof user?.onboarding_stage === "number";
  const isQuestionnairePath = typeof window !== "undefined" && window.location.pathname.includes("questionnaire");

  const computedStep = (() => {
    if (isQuestionnairePath && backendStage <= 3) return 4;
    if (backendStage === 0) return 1;
    if (backendStage === 1) return 2;
    if (backendStage === 2) return 3;
    if (backendStage === 3) return 4;
    return 5;
  })();

  const maxUnlockedStep = (() => {
    if (backendStage === 0) return 1;
    if (backendStage === 1) return 2;
    if (backendStage === 2) return 3;
    if (backendStage === 3) return 4;
    return 5;
  })();

  const handleSelectStep = (step: number) => {
    setActiveStep(step);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("step", String(step));
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    if (!hasStage) return;
    if (requestedStep && requestedStep >= 1 && requestedStep <= maxUnlockedStep) {
      setActiveStep(requestedStep);
    } else {
      // Enforce exact authoritative step from database state
      setActiveStep(computedStep);
    }

    if (status?.assigned_team && status.assigned_team.length > 0) {
      setAssignedTeam(status.assigned_team);
    }
  }, [status, hasStage, requestedStep, maxUnlockedStep, computedStep]);

  const currentStep = activeStep ?? computedStep;

  const handleTermsAccepted = async () => {
    setTermsSubmitting(true);
    setTermsError(null);
    try {
      await acceptTerms(userId);
      markStageReached(2);
      handleSelectStep(3); // Advance to Payment
    } catch (err: unknown) {
      setTermsError(err instanceof Error ? err.message : "Could not record your acceptance. Please try again.");
    } finally {
      setTermsSubmitting(false);
    }
  };

  const refreshStatus = async () => {
    await queryClient.invalidateQueries({ queryKey: statusKey });
  };

  if (isLoading && !hasStage) {
    return <CreoInlineLoader label="Loading your progress" />;
  }

  if (isError && !hasStage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="max-w-md w-full p-6 rounded-2xl bg-app-surface border border-app-line shadow-xl">
          <p className="text-sm text-rose-400 font-medium mb-3">
            Unable to connect to onboarding service.
          </p>
          <button
            type="button"
            onClick={() => void refreshStatus()}
            className="px-4 py-2 rounded-xl bg-app-accent-soft text-app-base font-bold text-xs hover:bg-hi transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center pb-6 sm:pb-8">
      {/* Visual Stepper */}
      <ProgressStepper
        activeStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onSelectStep={(step) => handleSelectStep(step)}
      />

      {/* Dynamic Stage Views */}
      <div className="w-full">
        <Suspense fallback={<CreoInlineLoader />}><AnimatePresence mode="popLayout">
          {currentStep === 1 && (
            <StageVerifyEmail
              key="verify"
              userEmail={user?.email}
              isAlreadyVerified={backendStage >= 1}
              onVerified={() => markStageReached(1)}
              onContinueToTerms={() => handleSelectStep(2)}
            />
          )}

          {currentStep === 2 && (
            <StageTerms
              key="terms"
              userId={userId}
              onAccepted={handleTermsAccepted}
              onBack={() => handleSelectStep(1)}
              onSkipToPayment={() => {
                markStageReached(2);
                handleSelectStep(3);
              }}
              isAlreadyAccepted={backendStage >= 2}
              isSubmitting={termsSubmitting}
              error={termsError}
            />
          )}

          {currentStep === 3 && (
            <StagePayment
              key="payment"
              userId={userId}
              isAlreadyPaid={backendStage >= 3}
              onBack={() => handleSelectStep(2)}
              onPaymentComplete={() => {
                markStageReached(3);
                handleSelectStep(4);
              }}
            />
          )}

          {currentStep === 5 && (
            <StageComplete
              key="complete"
              userId={userId}
              assignedTeam={assignedTeam}
              onLaunchPortal={onPortalLaunch ?? (() => {})}
            />
          )}
        </AnimatePresence></Suspense>

        {/* Keep paid clients' answers in memory during back/next navigation.
            A separate boundary lets this step load ahead without blocking earlier steps. */}
        {(backendStage >= 3 || currentStep === 4) && (
          <div hidden={currentStep !== 4}>
            <Suspense fallback={currentStep === 4 ? <CreoInlineLoader /> : null}>
              <StageQuestionnaire
                key={userId}
                userId={userId}
                isActive={currentStep === 4}
                initialSection={(searchParams.get("section") as any) || (status?.resume_section as any) || undefined}
                onComplete={(team) => {
                  if (team && team.length > 0) {
                    setAssignedTeam(team);
                  }
                  markStageReached(8);
                  handleSelectStep(5);
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}


export default OnboardingView;
