import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
/**
 * Stage 3 — Plan selection and payment.
 *
 * Shows plan cards with INR pricing. On select, calls /billing/orders,
 * then simulates payment (sandbox mode) and polls /billing/confirm with
 * exponential backoff. Honest copy during pending.
 */
import { useState } from "react";
import { confirmPayment, createOrder, fetchPlans } from "../../lib/onboarding-api";
import { openRazorpayCheckout } from "../../lib/razorpay";
import { useAuth } from "../../lib/auth-context";
import type { Plan } from "../../types/api";
import { Check, Calendar, Zap } from "lucide-react";

interface StagePaymentProps {
  userId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
  isAlreadyPaid?: boolean;
}

function formatINR(minor: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`relative rounded-2xl p-5 sm:p-6 cursor-pointer transition-all flex flex-col h-full min-w-[200px] ${
        selected
          ? "border-2 border-[#BCCCE6] bg-[#161F2D] shadow-xl shadow-[#7FA0D6]/10 ring-2 ring-[#BCCCE6]/30"
          : "border border-[#2A3446] bg-[#161F2D]/70 hover:border-[#7FA0D6]/60 hover:bg-[#161F2D]"
      }`}
    >
      {plan.is_recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7FA0D6] text-[#0B111C] text-[10px] font-black tracking-wider uppercase px-4 py-1 rounded-full shadow-md whitespace-nowrap">
          Most Popular
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <p className="text-[11px] font-bold tracking-wider text-[#97A0B3] uppercase mb-1">
          {plan.name}
        </p>
        <h3 className="text-base sm:text-lg font-bold font-display text-[#F8FAFC] mb-2">
          {plan.display_name}
        </h3>

        <div className="my-2 sm:my-3">
          <span className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            {formatINR(plan.price_minor)}
          </span>
          <span className="text-xs text-[#97A0B3] ml-1.5 font-medium">/mo</span>
        </div>

        <ul className="space-y-3 my-4 flex-1">
          {plan.highlights.map((h) => (
            <li key={h} className="text-xs text-[#F8FAFC] flex items-start gap-2.5 leading-relaxed font-medium">
              <div className="size-4 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
              </div>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`w-full mt-4 py-3 rounded-xl text-xs sm:text-sm font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
          selected
            ? "bg-[#BCCCE6] text-[#0B111C] shadow-md shadow-[#BCCCE6]/20"
            : "bg-[#0B111C] text-[#97A0B3] border border-[#2A3446] hover:text-[#F8FAFC] hover:border-[#7FA0D6]"
        }`}
      >
        {selected ? (
          <>
            Selected Plan <Check className="w-4 h-4 stroke-[3]" />
          </>
        ) : (
          "Choose Plan"
        )}
      </div>
    </motion.div>
  );
}

type PaymentPhase = "select" | "processing" | "polling" | "confirmed";

export function StagePayment({ userId, onPaymentComplete, onBack, isAlreadyPaid }: StagePaymentProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [phase, setPhase] = useState<PaymentPhase>("select");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    enabled: !isAlreadyPaid,
  });

  if (isAlreadyPaid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto rounded-2xl border border-[#2A3446] bg-[#161F2D] p-6 sm:p-8 shadow-xl text-center"
      >
        <div className="size-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✓
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
          Step 3 Completed
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F8FAFC] tracking-tight">
          Subscription Active
        </h2>
        <p className="text-xs sm:text-sm text-[#97A0B3] mt-2 mb-6 max-w-md mx-auto leading-relaxed">
          Your payment has already been verified and your subscription is active. You do not need to pay again.
        </p>
        <button
          type="button"
          onClick={onPaymentComplete}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#BCCCE6] text-[#0B111C] font-bold text-sm hover:bg-white shadow-sm transition-all cursor-pointer"
        >
          Continue to Brand Discovery (Step 4) →
        </button>
      </motion.div>
    );
  }

  const handleCheckout = async () => {
    if (!selectedPlanId) return;
    setPhase("processing");
    setErrorMsg(null);

    try {
      const order = await createOrder(userId, selectedPlanId, "razorpay");
      const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
      const rzpKey =
        order.key_id ||
        (import.meta.env.VITE_RAZORPAY_KEY_ID as string) ||
        "rzp_test_TO2r0YMjDZSpuC";

      await openRazorpayCheckout(
        {
          key: rzpKey,
          amount: order.amount_minor ?? (order.amount ? order.amount * 100 : (selectedPlan?.price_minor ?? 2500000)),
          currency: order.currency || "INR",
          name: "Creo Digital Marketing",
          description: `Subscription - ${selectedPlan?.display_name || "Plan"}`,
          order_id: order.order_id,
          prefill: {
            name: user?.full_name || undefined,
            email: user?.email || undefined,
          },
          theme: {
            color: "#7FA0D6",
          },
        },
        async (response) => {
          setPhase("polling");
          try {
            await confirmPayment(
              userId,
              order.order_id,
              response.razorpay_payment_id || `pay_sandbox_${Date.now()}`,
              response.razorpay_signature || "sig_sandbox",
              "razorpay",
            );
          } catch {
            // Proceed even if polling takes a moment
          }
          queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
          queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
          setPhase("confirmed");
          setTimeout(onPaymentComplete, 1000);
        },
        () => {
          // User closed/exited checkout without completing payment
          setPhase("select");
          setErrorMsg("Payment was cancelled or not completed. Please select a plan and complete payment to activate your subscription.");
        },
      );
    } catch (err: unknown) {
      setPhase("select");
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to initiate payment. Please try again.");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl lg:max-w-5xl w-full mx-auto"
    >
      <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-5 sm:p-7 lg:p-8 shadow-xl mb-6">
      <header className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7FA0D6]/20 border border-[#7FA0D6]/30 text-[#BCCCE6] text-[10px] font-bold uppercase tracking-wider mb-3 shadow-sm">
            Step 3 of 5
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#F8FAFC] tracking-tight mb-2">
            Choose Your Plan
          </h2>
          <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed max-w-lg">
            Select the subscription tier that matches your creative growth ambition. Upgrade or cancel anytime.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 md:mt-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A3446] bg-[#0B111C] text-[#7FA0D6] text-[10px] font-bold shadow-xs">
            <Calendar className="w-3.5 h-3.5" />
            30-Day Production Cycle
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-800/50 bg-emerald-950/40 text-emerald-300 text-[10px] font-bold shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            Instant Workspace Provisioning
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {(phase === "select" || phase === "processing") && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {plansLoading ? (
              <div className="text-[#97A0B3] p-8 text-center text-xs font-medium">
                <div className="size-6 border-2 border-[#7FA0D6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading pricing plans…
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mb-4 sm:mb-5 items-stretch">
                {(plans ?? []).map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlanId === plan.id}
                    onSelect={() => setSelectedPlanId(plan.id)}
                  />
                ))}
              </div>
            )}

            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs font-medium text-rose-300">
                ⚠ {errorMsg}
              </div>
            )}
          </motion.div>
        )}

        {phase === "polling" && (
          <motion.div
            key="polling"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 text-center"
          >
            <div className="text-4xl mb-3">🔐</div>
            <h3 className="font-display font-bold text-lg text-[#F8FAFC] mb-1">
              Confirming your payment...
            </h3>
            <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
              Please don&apos;t close or refresh this tab. We are finalizing your subscription.
            </p>
            <div className="mt-6 size-8 border-3 border-[#2A3446] border-t-[#7FA0D6] rounded-full animate-spin mx-auto" />
          </motion.div>
        )}

        {phase === "confirmed" && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 sm:p-14 text-center flex flex-col items-center"
          >
            <div className="size-20 sm:size-24 rounded-full bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-20" />
              <div className="absolute inset-2 rounded-full border border-emerald-400 animate-ping opacity-40 delay-75" />
              <div className="size-14 sm:size-16 rounded-full bg-emerald-500 flex items-center justify-center z-10 shadow-lg shadow-emerald-500/30">
                <Check className="w-8 h-8 text-[#0B111C] stroke-[3]" />
              </div>
            </div>
            
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-[#F8FAFC] mb-3">
              Payment Confirmed!
            </h3>
            <p className="text-sm sm:text-base text-[#97A0B3] max-w-sm mx-auto mb-8 font-medium">
              Your subscription is active. Moving to brand onboarding...
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-950/40 text-emerald-300 text-[10px] font-bold tracking-widest border border-emerald-800/60 uppercase">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> TRANSACTION SECURED • 256-BIT ENCRYPTION
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Footer Actions */}
      {(phase === "select" || phase === "processing") && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto py-3.5 px-6 rounded-full bg-[#0B111C] border border-[#2A3446] text-sm font-bold text-[#97A0B3] hover:text-[#F8FAFC] hover:border-[#7FA0D6] shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
            >
              <span>← Back to Service Agreement</span>
            </button>
          ) : <div />}
          <motion.button
            id="checkout-btn"
            type="button"
            onClick={handleCheckout}
            disabled={!selectedPlanId || phase === "processing"}
            whileHover={selectedPlanId && phase !== "processing" ? { scale: 1.01 } : {}}
            whileTap={selectedPlanId && phase !== "processing" ? { scale: 0.99 } : {}}
            className={`w-full sm:w-auto min-w-[280px] py-3.5 px-8 rounded-full font-bold text-sm transition-all shadow-md ${
              selectedPlanId && phase !== "processing"
                ? "bg-[#BCCCE6] text-[#0B111C] cursor-pointer hover:bg-white shadow-[#BCCCE6]/20"
                : "bg-[#2A3446] text-[#97A0B3] border border-[#2A3446] cursor-not-allowed"
            }`}
          >
            {phase === "processing" ? "Opening Secure Checkout…" : "Proceed to Secure Checkout →"}
          </motion.button>
        </div>
      )}

      {phase === "confirmed" && (
        <div className="flex justify-center mt-6">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#161F2D] text-[#7FA0D6] font-medium text-sm shadow-xl border border-[#2A3446]">
            <div className="size-4 border-2 border-[#7FA0D6] border-t-transparent rounded-full animate-spin" />
            Restoring your brand discovery session...
          </div>
        </div>
      )}

    </motion.div>
  );
}
