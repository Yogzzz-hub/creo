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
import {
  confirmPayment,
  createOrder,
  fetchPlans,
  fetchManualPaymentRequest,
  submitManualPaymentRequest,
  cancelManualPaymentRequest,
  type ManualPaymentRequest,
} from "../../lib/onboarding-api";
import { openRazorpayCheckout, preloadRazorpay } from "../../lib/razorpay";
import { useAuth } from "../../lib/auth-context";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import type { Plan } from "../../types/api";
import {
  Check,
  Zap,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Banknote,
  Clock,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

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
      className={`relative rounded-2xl p-5 sm:p-6 cursor-pointer transition-all duration-200 flex flex-col justify-between h-full select-none ${
        selected
          ? "border-2 border-app-accent bg-app-surface shadow-xl shadow-app-accent/10 ring-2 ring-app-accent/20 -translate-y-1"
          : "border border-app-line bg-app-surface/90 hover:border-app-accent/50 hover:bg-app-surface hover:-translate-y-0.5"
      } ${disabled ? "pointer-events-none opacity-80" : ""}`}
    >
      {/* Top Tag Slot (fixed height to ensure exact vertical alignment across all 3 cards) */}
      <div className="h-7 mb-2 flex items-center">
        {plan.is_recommended ? (
          <span className="inline-flex items-center gap-1.5 bg-app-accent text-app-base text-[11px] font-black tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">
            <Zap className="size-3 fill-app-base" /> Most Popular
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-app-base border border-app-line text-app-mist text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
            Monthly Retainer
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <p className="text-[11px] font-bold tracking-wider text-app-accent uppercase mb-1">
          {plan.name}
        </p>
        <h3 className="text-lg sm:text-xl font-bold font-display text-hi mb-2">
          {plan.display_name === "Scale" ? "Scale Enterprise" : plan.display_name}
        </h3>

        <div className="my-2.5 pb-3.5 border-b border-app-line flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-extrabold text-hi tracking-tight">
            {formatINR(plan.price_minor)}
          </span>
          <span className="text-xs text-app-mist font-medium">/month</span>
        </div>

        <ul className="space-y-2.5 my-3.5 flex-1">
          {plan.highlights.map((h) => (
            <li key={h} className="text-xs text-app-accent-soft flex items-start gap-2.5 leading-relaxed font-medium">
              <div className="size-4 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
              </div>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`w-full mt-5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
          selected
            ? "bg-app-accent-soft text-app-base shadow-md shadow-app-accent-soft/20 font-extrabold"
            : "bg-app-base text-app-mist border border-app-line hover:text-hi hover:border-app-accent"
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

  const confirm = useConfirm();
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMethod, setManualMethod] = useState("cash");
  const [manualPlanId, setManualPlanId] = useState<string>("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [cancellingManual, setCancellingManual] = useState(false);
  const [manualMsg, setManualMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: plans, isLoading: plansLoading, isError: plansError, refetch: refetchPlans } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    enabled: !isAlreadyPaid,
    staleTime: 5 * 60_000,
  });

  const {
    data: manualRequest,
    refetch: refetchManualRequest,
  } = useQuery<ManualPaymentRequest | null>({
    queryKey: ["manual-payment-request"],
    queryFn: fetchManualPaymentRequest,
    enabled: !isAlreadyPaid,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 4000 : false),
  });

  // Automatically advance to Step 4 if manual request is approved
  useEffect(() => {
    if (manualRequest?.status === "APPROVED") {
      onPaymentComplete();
    }
  }, [manualRequest?.status, onPaymentComplete]);

  useEffect(() => {
    if (selectedPlanId && !manualPlanId) {
      setManualPlanId(selectedPlanId);
    }
  }, [selectedPlanId, manualPlanId]);

  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      const first = plans[0];
      if (plans.length === 1 && first) {
        setSelectedPlanId(first.id);
        return;
      }
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
      } else if (first) {
        setSelectedPlanId(first.id);
      }
    }
  }, [plans, selectedPlanId]);

  useEffect(() => {
    if (!isAlreadyPaid) preloadRazorpay();
  }, [isAlreadyPaid]);

  const handleCancelManualRequest = async () => {
    const ok = await confirm({
      title: "Cancel Offline Payment Request?",
      description: "Are you sure you want to cancel your offline verification request and return to online checkout?",
      confirmText: "Yes, Cancel Request",
      cancelText: "Keep Pending",
      tone: "warning",
    });
    if (!ok) return;

    setCancellingManual(true);
    try {
      await cancelManualPaymentRequest();
      await refetchManualRequest();
      await queryClient.invalidateQueries({ queryKey: ["manual-payment-request"] });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to cancel request.");
    } finally {
      setCancellingManual(false);
    }
  };

  const handleSubmitManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const planToUse = manualPlanId || selectedPlanId;
    if (!planToUse) {
      setManualMsg({ type: "error", text: "Please select a retainer plan." });
      return;
    }
    setManualSubmitting(true);
    setManualMsg(null);
    try {
      await submitManualPaymentRequest(planToUse, manualMethod, manualNotes);
      await refetchManualRequest();
      await queryClient.invalidateQueries({ queryKey: ["manual-payment-request"] });
      setShowManualModal(false);
      setManualNotes("");
    } catch (err: unknown) {
      setManualMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit offline payment request.",
      });
    } finally {
      setManualSubmitting(false);
    }
  };

  if (isAlreadyPaid || manualRequest?.status === "APPROVED") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto rounded-2xl border border-app-line bg-app-surface p-6 sm:p-8 shadow-xl text-center"
      >
        <div className="size-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          <ShieldCheck className="size-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
          Step 3 Bypassed & Verified
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-hi tracking-tight">
          Retainer Subscription Active
        </h2>
        <p className="text-sm text-app-mist mt-2 mb-6 max-w-md mx-auto leading-relaxed">
          Your offline payment has been approved and verified by agency admin. Step 3 (Payment) is complete! You can now proceed directly to Brand Discovery.
        </p>
        <button
          type="button"
          onClick={onPaymentComplete}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-app-accent-soft text-app-base font-bold text-sm hover:bg-hi shadow-sm transition-all cursor-pointer"
        >
          <span>Continue to Brand Discovery (Step 4)</span>
          <ArrowRight className="size-4" />
        </button>
      </motion.div>
    );
  }

  // PENDING MANUAL VERIFICATION STATE
  if (manualRequest?.status === "PENDING") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto rounded-2xl border border-app-line bg-app-surface p-6 sm:p-8 shadow-xl text-center"
      >
        <div className="size-14 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Clock className="size-8 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
          Approval Pending
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-hi tracking-tight">
          Offline Payment Verification Pending
        </h2>
        <p className="text-sm text-app-mist mt-2 max-w-md mx-auto leading-relaxed">
          You requested offline payment verification for the <strong className="text-hi">{manualRequest.plan_display_name || "selected"}</strong> retainer via <strong className="text-hi uppercase">{manualRequest.payment_method.replace('_', ' ')}</strong> (₹{manualRequest.amount?.toLocaleString('en-IN')}).
        </p>

        {manualRequest.reference_note && (
          <div className="my-4 p-3 bg-app-base rounded-xl border border-app-line text-left text-xs">
            <span className="text-app-mist block font-medium mb-0.5">Your Reference Note:</span>
            <span className="text-app-ink">{manualRequest.reference_note}</span>
          </div>
        )}

        <div className="p-3.5 bg-blue-950/30 border border-blue-800/50 rounded-xl text-xs text-blue-200 mt-4 mb-6 leading-relaxed">
          ⚡ <strong>Payment Bypass in Progress:</strong> Your agency admin has been notified. As soon as they confirm receipt, Step 3 will be bypassed automatically and unlock Step 4 (Brand Questionnaire).
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => void refetchManualRequest()}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-app-base border border-app-line hover:border-app-accent text-xs font-bold text-hi transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="size-3.5" />
            <span>Check Status</span>
          </button>
          <button
            type="button"
            onClick={handleCancelManualRequest}
            disabled={cancellingManual}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-bold text-rose-300 transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {cancellingManual ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            <span>Cancel & Pay Online</span>
          </button>
        </div>
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
          order_id: order.recurring ? undefined : order.order_id,
          subscription_id: order.razorpay_subscription_id,
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
            const confirmation = await confirmPayment(
              userId,
              order.order_id,
              response.razorpay_payment_id || `pay_sandbox_${Date.now()}`,
              response.razorpay_signature || "sig_sandbox",
              "razorpay",
            );
            if (confirmation.status !== "active") throw new Error("Your first payment is still pending. Check billing before continuing.");
          } catch (err) {
            setPhase("select"); checkoutLock.current = false;
            setErrorMsg(err instanceof Error ? err.message : "Payment has not been confirmed.");
            return;
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

      {/* Confirmation Banner overlay/compact state (never replacing the page with an empty box) */}
      <AnimatePresence>
        {phase === "polling" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-5 sm:p-6 rounded-2xl bg-app-base border border-app-accent/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-xl bg-app-surface border border-app-line flex items-center justify-center text-app-accent shrink-0">
                <Loader2 className="size-5 animate-spin text-app-accent" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-hi">Confirming your payment...</h4>
                <p className="text-xs text-app-mist mt-0.5">
                  Verifying transaction with payment gateway for {selectedPlan?.display_name || "selected plan"}. Please don't close this window.
                </p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-app-accent-soft bg-app-surface border border-app-line px-3.5 py-1.5 rounded-lg shrink-0">
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
              <div className="size-11 rounded-xl bg-emerald-500 text-app-base flex items-center justify-center font-black shrink-0">
                <Check className="size-6 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-hi">Payment Confirmed!</h4>
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

      {/* Plan Cards Grid: Dedicated single-card layout for custom negotiated plans, or 3-column grid for standard tiers */}
      {plansLoading ? (
        <div role="status" className="rounded-2xl border border-app-line bg-app-surface p-12 text-center text-app-mist">
          <Loader2 aria-hidden="true" className="size-7 animate-spin text-app-accent mx-auto mb-3 motion-reduce:animate-none" />
          <p className="text-xs font-medium">Loading pricing plans…</p>
        </div>
      ) : plansError || !plans || plans.length === 0 ? (
        <div role="alert" className="rounded-2xl border border-rose-800/60 bg-rose-950/30 p-8 text-center text-rose-200">
          <p className="text-sm font-bold mb-1">We couldn&apos;t load your plan.</p>
          <p className="text-xs text-rose-300/80 mb-4">
            Please try again. If this keeps happening, contact your agency admin.
          </p>
          <button
            type="button"
            onClick={() => void refetchPlans()}
            className="px-5 py-2 rounded-xl bg-app-base border border-app-line text-xs font-bold text-hi hover:border-app-accent cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : plans && plans.length === 1 && plans[0] ? (
        (() => {
          const singlePlan = plans[0]!;
          return (
            <div className="max-w-xl mx-auto w-full space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="leading-relaxed">
                  <strong>Approved Commercial Agreement:</strong> Your requested retainer and custom deliverable quota have been approved by Creo leadership. Standard tiers are omitted for your account.
                </span>
              </div>
              <PlanCard
                plan={singlePlan}
                selected={selectedPlanId === singlePlan.id}
                onSelect={() => setSelectedPlanId(singlePlan.id)}
                disabled={phase === "processing" || phase === "polling" || phase === "confirmed"}
              />
            </div>
          );
        })()
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

      <p className="rounded-xl border border-app-line bg-app-surface p-4 text-sm text-app-accent-soft">Monthly Razorpay AutoPay is required. Checkout authorizes recurring charges at your selected plan price. Request a future renewal pause in Settings; an admin must approve it before charges stop.</p>
      {/* Footer Actions */}
      <div className="rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={phase === "processing" || phase === "polling"}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-app-base border border-app-line text-sm font-bold text-app-mist hover:text-hi hover:border-app-accent shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 text-app-accent" />
            <span>Back to Agreement</span>
          </button>
        ) : <div />}

        <button
          id="checkout-btn"
          type="button"
          onClick={handleCheckout}
          disabled={!selectedPlanId || phase === "processing" || phase === "polling" || phase === "confirmed"}
          className={`w-full sm:w-auto min-w-[280px] py-3 px-8 rounded-xl font-bold text-sm transition-all shadow-md inline-flex items-center justify-center gap-2 ${
            selectedPlanId && phase === "select"
              ? "bg-app-accent-soft text-app-base cursor-pointer hover:bg-hi shadow-app-accent-soft/20"
              : "bg-app-surface text-app-mist border border-app-line cursor-not-allowed shadow-none"
          }`}
        >
          {phase === "processing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-app-base" />
              <span>Opening Secure Checkout…</span>
            </>
          ) : phase === "polling" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-app-base" />
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

      {/* Offline Payment Request Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-app-line bg-app-surface p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-app-accent/20 border border-app-accent/40 flex items-center justify-center text-app-accent">
                  <Banknote className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-hi">Offline Payment Verification</h3>
                  <p className="text-[11px] text-app-mist">Request Step 3 payment bypass for offline retainers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-lg text-app-mist hover:text-hi hover:bg-app-base cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {manualMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                manualMsg.type === "success"
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                  : "bg-rose-950/40 text-rose-300 border border-rose-800/60"
              }`}>
                {manualMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmitManualRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-hi mb-1.5">Selected Retainer Plan</label>
                <select
                  value={manualPlanId || selectedPlanId || ""}
                  onChange={(e) => setManualPlanId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-app-accent"
                  required
                >
                  {(plans || []).length === 0 && <option value="">No plans available</option>}
                  {(plans || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name} — {formatINR(p.price_minor)}/month
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-hi mb-1.5">Offline Payment Method</label>
                <select
                  value={manualMethod}
                  onChange={(e) => setManualMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-app-accent"
                >
                  <option value="cash">Cash (Direct in Office / Handed Over)</option>
                  <option value="bank_transfer">Direct Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="upi">Direct UPI / QR Transfer</option>
                  <option value="cheque">Company Cheque / Demand Draft</option>
                  <option value="existing_contract">Existing Retainer Agreement / Contract</option>
                  <option value="other">Other Offline Method</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-hi mb-1.5">Payment Reference Notes / Transaction ID</label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Paid cash directly to agency management, or Bank UTR number 9812401..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-app-accent"
                />
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-[11px] text-blue-200 leading-relaxed">
                ℹ️ <strong>How this works:</strong> Your agency admin will verify your payment details. Once approved, Step 3 (Payment) will be bypassed automatically, your monthly quotas will activate, and you will proceed directly to Step 4 (Brand Questionnaire).
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl border border-app-line bg-app-base text-xs font-bold text-app-mist hover:text-hi cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-5 py-2 rounded-xl bg-app-accent-soft text-app-base text-xs font-bold hover:bg-hi transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {manualSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>Submit Verification Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default StagePayment;
