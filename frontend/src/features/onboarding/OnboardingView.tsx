import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { CheckCircle2, Mail, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { acceptTerms, fetchOnboardingStatus } from "../../lib/onboarding-api";
import { useAuth } from "../../lib/auth-context";
import { StageComplete } from "./StageComplete";
import { StagePayment } from "./StagePayment";
import { StageQuestionnaire } from "./StageQuestionnaire";
import { StageTerms } from "./StageTerms";
import { OtpPinInput } from "../../components/ui/OtpPinInput";
import type { AssignedTeamMember } from "../../types/api";

interface OnboardingViewProps {
  userId: string;
  onPortalLaunch?: () => void;
}

const STAGES = [
  { step: 1, label: "Email Verified", short: "Verify" },
  { step: 2, label: "Terms Signed", short: "Terms" },
  { step: 3, label: "Payment Done", short: "Payment" },
  { step: 4, label: "Brand Set", short: "Brand DNA" },
  { step: 5, label: "Active", short: "Launch" },
];

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
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto mb-8 sm:mb-10 px-2 sm:px-4">
      {/* Stepper Card */}
      <div className="relative bg-white rounded-2xl shadow-xs border border-[#C9DFF0] px-5 sm:px-8 py-4 sm:py-5">
        <div className="flex items-start justify-between relative">

          {/* Background track line */}
          <div
            className="absolute left-0 right-0 h-[2px] rounded-full bg-slate-100"
            style={{ top: "16px", marginLeft: "8%", marginRight: "8%" }}
          />

          {/* Completed track line (grows with progress) */}
          <div
            className="absolute h-[2px] rounded-full transition-all duration-500"
            style={{
              top: "16px",
              marginLeft: "8%",
              width: `calc(${Math.max(0, ((maxUnlockedStep - 1) / (STAGES.length - 1)))} * 84%)`,
              background: "#059669",
            }}
          />

          {STAGES.map((s) => {
            const isDone = s.step < maxUnlockedStep;
            const isActive = s.step === activeStep;
            const isUnlocked = s.step <= maxUnlockedStep;

            return (
              <div key={s.step} className="flex flex-col items-center flex-1 relative z-10">
                <div
                  onClick={() => isUnlocked && onSelectStep?.(s.step)}
                  className={`flex flex-col items-center select-none ${
                    isUnlocked ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed"
                  }`}
                >
                  {/* Step circle */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`relative size-8 sm:size-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors duration-200 ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isActive
                          ? "bg-[#2B7BC4] text-white"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {isDone ? (
                        <svg className="size-3.5 sm:size-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span>{s.step}</span>
                      )}
                    </div>
                  </div>

                  {/* Step label */}
                  <div className="mt-2 text-center">
                    <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                      isActive ? "text-[#2B7BC4]" : isDone ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      Step {s.step}
                    </p>
                    <p className={`text-[10px] sm:text-xs font-bold transition-colors ${
                      isActive
                        ? "text-[#0D2137]"
                        : isDone
                        ? "text-emerald-800"
                        : "text-slate-500"
                    }`}>
                      <span className="sm:hidden">{s.short}</span>
                      <span className="hidden sm:inline whitespace-nowrap">{s.label}</span>
                    </p>
                  </div>
                </div>
              </div>
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
  onContinueToTerms,
}: {
  userEmail?: string;
  isAlreadyVerified: boolean;
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
      setVerifiedSuccess(true);
      setMessage({ type: "success", text: "Email verified successfully!" });
      setTimeout(onContinueToTerms, 600);
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
      className="max-w-xl mx-auto rounded-2xl border border-[#C9DFF0] bg-white p-8 sm:p-12 shadow-sm text-center"
    >
      <div className="size-14 mx-auto mb-4 rounded-2xl bg-[#E8F4FD] border border-[#C9DFF0] flex items-center justify-center text-[#2B7BC4]">
        {verifiedSuccess ? (
          <ShieldCheck className="size-7 text-emerald-600" />
        ) : (
          <Mail className="size-7 text-[#2B7BC4]" />
        )}
      </div>

      <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0D2137] tracking-tight">
        {verifiedSuccess ? "Email Verified" : "Verify Your Email"}
      </h2>
      <p className="text-xs sm:text-sm text-[#64748B] mt-2 max-w-md mx-auto leading-relaxed">
        {verifiedSuccess
          ? "Your email address has been confirmed. You can now proceed to review and sign the Master Service Agreement."
          : "We protect your agency workspace with fast email verification. Enter your email to receive a 6-digit code."}
      </p>

      {message && (
        <div
          className={`mt-4 p-3 rounded-xl text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {verifiedSuccess ? (
        <div className="mt-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Verified: {userEmail || email || "Active Client"}</span>
          </div>

          <div>
            <button
              type="button"
              onClick={onContinueToTerms}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2B7BC4] text-white font-semibold text-xs sm:text-sm hover:bg-[#1A5EA8] shadow-xs transition-all cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#0D2137] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2B7BC4] text-white font-semibold text-sm hover:bg-[#1A5EA8] shadow-sm transition-all disabled:opacity-50"
              >
                {loading && <RefreshCw className="size-4 animate-spin" />}
                <span>Send Verification Code</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Enter 6-Digit Security Code
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-xs font-semibold text-[#2B7BC4] hover:underline"
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
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2B7BC4] text-white font-semibold text-sm hover:bg-[#1A5EA8] shadow-sm transition-all disabled:opacity-50"
              >
                {loading && <RefreshCw className="size-4 animate-spin" />}
                <span>Verify Code & Continue</span>
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-[#F0F4F8] text-center">
            <button
              type="button"
              onClick={onContinueToTerms}
              className="text-xs text-[#64748B] hover:text-[#0D2137] underline transition-colors"
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
  const [termsSubmitting, setTermsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [assignedTeam, setAssignedTeam] = useState<AssignedTeamMember[] | undefined>(undefined);

  const {
    data: status,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["onboarding-status", userId],
    queryFn: () => fetchOnboardingStatus(userId),
    refetchInterval: 5000,
  });

  // Calculate user's current unlocked step (1 to 5)
  // Backend view maps:
  // stage 0 -> step 1 (Email verification pending)
  // stage 1 -> step 2 (Email verified, terms pending)
  // stage 2 -> step 3 (Terms accepted, payment pending)
  // stage 3 -> step 4 (Payment done, questionnaire pending)
  // stage 4 -> step 5 (Questionnaire submitted, ready to complete)
  // stage 5 -> step 5 (Active)
  const backendStage = status?.stage ?? 1;
  const maxUnlockedStep = Math.min(5, Math.max(1, backendStage + 1));

  useEffect(() => {
    if (status) {
      setActiveStep((prev) => {
        // Initial setup on mount
        if (prev === null) {
          return maxUnlockedStep;
        }
        // Advance only if user is strictly behind unlocked steps and not actively on step 4
        if (prev < maxUnlockedStep && prev !== 4) {
          return maxUnlockedStep;
        }
        return prev;
      });
      if (status.assigned_team && status.assigned_team.length > 0) {
        setAssignedTeam(status.assigned_team);
      }
    }
  }, [status, maxUnlockedStep]);

  const currentStep = activeStep ?? maxUnlockedStep;

  const handleTermsAccepted = async () => {
    setTermsSubmitting(true);
    try {
      await acceptTerms(userId);
      await queryClient.invalidateQueries({ queryKey: ["onboarding-status", userId] });
      setActiveStep(3); // Advance to Payment
    } finally {
      setTermsSubmitting(false);
    }
  };

  const refreshStatus = async () => {
    await queryClient.invalidateQueries({ queryKey: ["onboarding-status", userId] });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#64748B]">
        <div className="size-8 rounded-full border-3 border-[#2B7BC4] border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Loading onboarding progress...</span>
      </div>
    );
  }

  if (isError || !status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white border border-[#C9DFF0] shadow-sm">
          <p className="text-sm text-rose-600 font-medium mb-3">
            Unable to connect to onboarding service.
          </p>
          <button
            type="button"
            onClick={() => void refreshStatus()}
            className="px-4 py-2 rounded-xl bg-[#2B7BC4] text-white font-semibold text-xs hover:bg-[#1A5EA8] transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center pb-20 sm:pb-28">
      {/* Visual Stepper */}
      <ProgressStepper
        activeStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onSelectStep={(step) => setActiveStep(step)}
      />

      {/* Dynamic Stage Views */}
      <div className="w-full">
        <AnimatePresence mode="popLayout">
          {currentStep === 1 && (
            <StageVerifyEmail
              key="verify"
              userEmail={user?.email}
              isAlreadyVerified={backendStage >= 1}
              onContinueToTerms={() => setActiveStep(2)}
            />
          )}

          {currentStep === 2 && (
            <StageTerms
              key="terms"
              userId={userId}
              onAccepted={handleTermsAccepted}
              isSubmitting={termsSubmitting}
            />
          )}

          {currentStep === 3 && (
            <StagePayment
              key="payment"
              userId={userId}
              isAlreadyPaid={backendStage >= 3}
              onPaymentComplete={() => {
                void refreshStatus();
                setActiveStep(4);
              }}
            />
          )}

          {currentStep === 4 && (
            <StageQuestionnaire
              key="questionnaire"
              userId={userId}
              onComplete={(team) => {
                if (team && team.length > 0) {
                  setAssignedTeam(team);
                }
                void refreshStatus();
                setActiveStep(5);
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
        </AnimatePresence>
      </div>
    </div>
  );
}


export default OnboardingView;
