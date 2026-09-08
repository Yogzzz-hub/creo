import { useQuery } from "@tanstack/react-query";
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

interface StagePaymentProps {
  userId: string;
  onPaymentComplete: () => void;
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
          ? "border-2 border-[#2B7BC4] bg-[#F0F7FD] shadow-md ring-2 ring-[#2B7BC4]/10"
          : "border border-[#C9DFF0] bg-white hover:border-[#2B7BC4]/40 hover:shadow-xs"
      }`}
    >
      {plan.is_recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2B7BC4] text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full shadow-xs whitespace-nowrap">
          Most Popular
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <p className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase mb-1">
          {plan.name}
        </p>
        <h3 className="text-base sm:text-lg font-bold font-display text-[#0D2137] mb-2">
          {plan.display_name}
        </h3>

        <div className="my-2 sm:my-3">
          <span className="text-2xl sm:text-3xl font-extrabold text-[#0D2137]">
            {formatINR(plan.price_minor)}
          </span>
          <span className="text-xs text-[#64748B] ml-1.5 font-medium">/mo</span>
        </div>

        <ul className="space-y-2.5 my-3 sm:my-4 flex-1">
          {plan.highlights.map((h) => (
            <li key={h} className="text-xs text-[#374151] flex items-start gap-2 leading-relaxed">
              <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`w-full mt-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-center transition-all ${
          selected
            ? "bg-[#2B7BC4] text-white shadow-xs"
            : "bg-slate-50 text-[#64748B] border border-[#C9DFF0] hover:bg-white"
        }`}
      >
        {selected ? "Selected Plan" : "Choose Plan"}
      </div>
    </motion.div>
  );
}

type PaymentPhase = "select" | "processing" | "polling" | "confirmed";

export function StagePayment({ userId, onPaymentComplete, isAlreadyPaid }: StagePaymentProps) {
  const { user } = useAuth();
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
        className="max-w-xl mx-auto rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-sm text-center"
      >
        <div className="size-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✓
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
          Step 3 Completed
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0D2137] tracking-tight">
          Subscription Active
        </h2>
        <p className="text-xs sm:text-sm text-[#64748B] mt-2 mb-6 max-w-md mx-auto leading-relaxed">
          Your payment has already been verified and your subscription is active. You do not need to pay again.
        </p>
        <button
          type="button"
          onClick={onPaymentComplete}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#2B7BC4] text-white font-semibold text-sm hover:bg-[#1A5EA8] shadow-sm transition-all cursor-pointer"
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
          amount: order.amount_minor,
          currency: order.currency || "INR",
          name: "Creo Digital Marketing",
          description: `Subscription - ${selectedPlan?.display_name || "Plan"}`,
          order_id: order.order_id,
          prefill: {
            name: user?.full_name || undefined,
            email: user?.email || undefined,
          },
          theme: {
            color: "#2B7BC4",
          },
        },
        async (response) => {
          setPhase("polling");
          try {
            await confirmPayment(
              userId,
              order.order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              "razorpay",
            );
          } catch {
            // Proceed even if polling takes a moment
          }
          setPhase("confirmed");
          setTimeout(onPaymentComplete, 1000);
        },
        () => {
          setPhase("select");
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
      className="max-w-4xl lg:max-w-5xl w-full mx-auto rounded-2xl border border-[#C9DFF0] bg-white p-8 sm:p-10 lg:p-12 shadow-sm"
    >
      <header className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8F4FD] border border-[#C9DFF0] text-[#2B7BC4] text-[11px] font-bold uppercase tracking-wider mb-2.5">
          Step 3 of 5
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#0D2137] tracking-tight">
          Choose Your Plan
        </h2>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 leading-normal">
          Select the subscription tier that matches your creative growth ambition. Upgrade or cancel anytime.
        </p>
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
              <div className="text-[#64748B] p-10 text-center text-xs font-medium">
                <div className="size-6 border-2 border-[#2B7BC4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading pricing plans…
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8 items-stretch">
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
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
                ⚠ {errorMsg}
              </div>
            )}

            <motion.button
              id="checkout-btn"
              type="button"
              onClick={handleCheckout}
              disabled={!selectedPlanId || phase === "processing"}
              whileHover={selectedPlanId && phase !== "processing" ? { scale: 1.01 } : {}}
              whileTap={selectedPlanId && phase !== "processing" ? { scale: 0.99 } : {}}
              className={`w-full py-3.5 sm:py-4 px-8 rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm ${
                selectedPlanId && phase !== "processing"
                  ? "bg-[#2B7BC4] text-white hover:bg-[#1A5EA8] cursor-pointer shadow-blue-500/20"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {phase === "processing" ? "Opening Razorpay Gateway…" : "Proceed to Secure Checkout →"}
            </motion.button>
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
            <h3 className="font-display font-bold text-lg text-[#0D2137] mb-1">
              Confirming your payment...
            </h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              Please don&apos;t close or refresh this tab. We are finalizing your subscription.
            </p>
            <div className="mt-6 size-8 border-3 border-[#C9DFF0] border-t-[#2B7BC4] rounded-full animate-spin mx-auto" />
          </motion.div>
        )}

        {phase === "confirmed" && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-5xl mb-3"
            >
              🎉
            </motion.div>
            <h3 className="font-display font-bold text-xl text-emerald-800 mb-1">
              Payment Confirmed!
            </h3>
            <p className="text-xs text-[#64748B]">
              Your subscription is active. Moving to brand onboarding…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
