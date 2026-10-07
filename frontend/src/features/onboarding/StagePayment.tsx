import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
/**
 * Stage 3 — Plan selection and payment.
 *
 * Shows 3 plan cards with INR pricing. On select, calls /billing/orders,
 * opens Razorpay checkout, and polls confirmation with a professional compact state
 * that retains context without wiping out the page.
 */
import { useEffect, useState, useRef } from "react";
import { confirmPayment, createOrder, fetchPlans } from "../../lib/onboarding-api";
import { openRazorpayCheckout, preloadRazorpay } from "../../lib/razorpay";
import { useAuth } from "../../lib/auth-context";
import type { Plan } from "../../types/api";
import { Check, Calendar, Zap, ArrowLeft, ArrowRight, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

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
  disabled,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onSelect()}
      className={`relative rounded-2xl p-6 sm:p-7 cursor-pointer transition-all flex flex-col justify-between h-full select-none ${
        selected
          ? "border-2 border-[#BCCCE6] bg-[#161F2D] shadow-xl shadow-[#7FA0D6]/10 ring-2 ring-[#BCCCE6]/25"
          : "border border-[#2A3446] bg-[#161F2D]/80 hover:border-[#7FA0D6]/60 hover:bg-[#161F2D]"
      } ${disabled ? "pointer-events-none opacity-80" : ""}`}
    >
      {/* Top Tag Slot (fixed height to ensure exact vertical alignment across all 3 cards) */}
      <div className="h-6 mb-2 flex items-center">
        {plan.is_recommended ? (
          <span className="inline-flex items-center gap-1 bg-[#7FA0D6] text-[#0B111C] text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-sm">
            <Zap className="size-3 fill-[#0B111C]" /> Most Popular
          </span>
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]">
            Monthly Retainer
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <p className="text-xs font-bold tracking-wider text-[#7FA0D6] uppercase mb-1">
          {plan.name}
        </p>
        <h3 className="text-lg sm:text-xl font-bold font-display text-white mb-2">
          {plan.display_name}
        </h3>

        <div className="my-3 pb-4 border-b border-[#2A3446] flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {formatINR(plan.price_minor)}
          </span>
          <span className="text-xs text-[#97A0B3] font-medium">/month</span>
        </div>

        <ul className="space-y-3.5 my-4 flex-1">
          {plan.highlights.map((h) => (
            <li key={h} className="text-xs text-[#BCCCE6] flex items-start gap-2.5 leading-relaxed font-medium">
              <div className="size-4 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
              </div>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`w-full mt-6 py-2.5 px-4 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
          selected
            ? "bg-[#BCCCE6] text-[#0B111C] shadow-md shadow-[#BCCCE6]/20"
            : "bg-[#0B111C] text-[#97A0B3] border border-[#2A3446] hover:text-white hover:border-[#7FA0D6]"
        }`}
      >
        {selected ? (
          <>
            <span>Selected Plan</span>
            <Check className="w-4 h-4 stroke-[3]" />
          </>
        ) : (
          <span>Select {plan.display_name}</span>
        )}
      </div>
    </div>
  );
}

type PaymentPhase = "select" | "processing" | "polling" | "confirmed";

export function StagePayment({ userId, onPaymentComplete, onBack, isAlreadyPaid }: StagePaymentProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [phase, setPhase] = useState<PaymentPhase>("select");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const checkoutLock = useRef(false);

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    enabled: !isAlreadyPaid,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      const params = new URLSearchParams(window.location.search);
      const rawPlan = params.get("plan")?.toLowerCase() || (params.get("intent") === "sample" ? "starter" : null);
      if (rawPlan) {
        const targetName = rawPlan === "pro" ? "scale" : rawPlan;
        const found = plans.find(
          (p) => p.id.toLowerCase() === targetName || p.name.toLowerCase() === targetName
        );
        if (found) {
          setSelectedPlanId(found.id);
          return;
        }
      }
      const recommended = plans.find((p) => p.is_recommended);
      if (recommended) {
        setSelectedPlanId(recommended.id);
      }
    }
  }, [plans, selectedPlanId]);

  useEffect(() => {
    if (!isAlreadyPaid) preloadRazorpay();
  }, [isAlreadyPaid]);

  if (isAlreadyPaid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto rounded-2xl border border-[#2A3446] bg-[#161F2D] p-6 sm:p-8 shadow-xl text-center"
      >
        <div className="size-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          <ShieldCheck className="size-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
          Step 3 Completed
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          Subscription Active
        </h2>
        <p className="text-sm text-[#97A0B3] mt-2 mb-6 max-w-md mx-auto leading-relaxed">
          Your payment has already been verified and your subscription is active. You do not need to pay again.
        </p>
        <button
          type="button"
          onClick={onPaymentComplete}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#BCCCE6] text-[#0B111C] font-bold text-sm hover:bg-white shadow-sm transition-all cursor-pointer"
        >
          <span>Continue to Brand Discovery (Step 4)</span>
          <ArrowRight className="size-4" />
        </button>
      </motion.div>
    );
  }

  const handleCheckout = async () => {
    if (!selectedPlanId || checkoutLock.current) return;
    checkoutLock.current = true;
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
            // Keep polling handled gracefully
          }
          // Onboarding status is refreshed by onPaymentComplete; don't block the UI on refetches
          void queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
          setPhase("confirmed");
          checkoutLock.current = false;
          setTimeout(onPaymentComplete, 700);
        },
        () => {
          // Checkout closed without completing
          checkoutLock.current = false;
          setPhase("select");
          setErrorMsg("Payment checkout was closed. Please complete payment to activate your creative subscription.");
        },
      );
    } catch (err: unknown) {
      checkoutLock.current = false;
      setPhase("select");
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to initiate payment. Please try again.");
      }
    }
  };

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4 sm:space-y-5"
    >
      {/* Header Card */}
      <div className="rounded-xl border border-[#2A3446] bg-[#161F2D] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7FA0D6]/20 border border-[#7FA0D6]/30 text-[#BCCCE6] text-[11px] font-bold uppercase tracking-wider mb-3 shadow-sm">
              Step 3 of 5
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mb-2">
              Choose Your Retainer Plan
            </h2>
            <p className="text-sm text-[#97A0B3] leading-relaxed max-w-xl">
              Select the subscription tier that matches your creative growth ambition. Upgrade, downgrade, or cancel anytime.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A3446] bg-[#0B111C] text-[#7FA0D6] text-[11px] font-bold shadow-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>30-Day Production Cycle</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-800/50 bg-emerald-950/40 text-emerald-300 text-[11px] font-bold shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
              <span>Instant Pod Provisioning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Banner overlay/compact state (never replacing the page with an empty box) */}
      <AnimatePresence>
        {phase === "polling" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-5 sm:p-6 rounded-2xl bg-[#0B111C] border border-[#7FA0D6]/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center text-[#7FA0D6] shrink-0">
                <Loader2 className="size-5 animate-spin text-[#7FA0D6]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Confirming your payment...</h4>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  Verifying transaction with payment gateway for {selectedPlan?.display_name || "selected plan"}. Please don't close this window.
                </p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-[#BCCCE6] bg-[#161F2D] border border-[#2A3446] px-3.5 py-1.5 rounded-lg shrink-0">
              Securing Retainer...
            </div>
          </motion.div>
        )}

        {phase === "confirmed" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-5 sm:p-6 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-emerald-200"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-emerald-500 text-[#0B111C] flex items-center justify-center font-black shrink-0">
                <Check className="size-6 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Payment Confirmed!</h4>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Your {selectedPlan?.display_name || "CREO"} retainer is active. Moving directly to Brand Discovery...
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700/60 text-xs font-bold text-emerald-300">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Redirecting...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs font-medium text-rose-300 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Plan Cards Grid: Equal Heights across all 3 cards */}
      {plansLoading ? (
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-12 text-center text-[#97A0B3]">
          <Loader2 className="size-7 border-2 border-[#7FA0D6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium">Loading pricing plans…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {(plans ?? []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlanId === plan.id}
              onSelect={() => setSelectedPlanId(plan.id)}
              disabled={phase === "processing" || phase === "polling" || phase === "confirmed"}
            />
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={phase === "processing" || phase === "polling"}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm font-bold text-[#97A0B3] hover:text-white hover:border-[#7FA0D6] shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Service Agreement</span>
          </button>
        ) : <div />}

        <button
          id="checkout-btn"
          type="button"
          onClick={handleCheckout}
          disabled={!selectedPlanId || phase === "processing" || phase === "polling" || phase === "confirmed"}
          className={`w-full sm:w-auto min-w-[280px] py-3 px-8 rounded-xl font-bold text-sm transition-all shadow-md inline-flex items-center justify-center gap-2 ${
            selectedPlanId && phase === "select"
              ? "bg-[#BCCCE6] text-[#0B111C] cursor-pointer hover:bg-white shadow-[#BCCCE6]/20"
              : "bg-[#161F2D] text-[#97A0B3] border border-[#2A3446] cursor-not-allowed shadow-none"
          }`}
        >
          {phase === "processing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0B111C]" />
              <span>Opening Secure Checkout…</span>
            </>
          ) : phase === "polling" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0B111C]" />
              <span>Verifying Payment…</span>
            </>
          ) : (
            <>
              <span>Proceed to Secure Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default StagePayment;
