import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, PhoneCall, Loader2, Zap } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { createOrder, confirmPayment } from "../../lib/onboarding-api";
import { openRazorpayCheckout } from "../../lib/razorpay";
import type { Plan } from "../../types/api";

interface ComparePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  onOpenNegotiation: (topic: string) => void;
}

export function ComparePlansModal({
  isOpen,
  onClose,
  currentPlanName,
  onOpenNegotiation,
}: ComparePlansModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const { data: plans, isLoading: isPlansLoading } = useQuery<Plan[]>({
    queryKey: ["public-plans"],
    queryFn: () => request<Plan[]>("/api/v1/payments/plans"),
    enabled: isOpen,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSwitchPlan = async (plan: Plan) => {
    if (!user?.id || processingPlanId) return;
    setProcessingPlanId(plan.id);
    setErrorNotice(null);

    try {
      const order = await createOrder(user.id, plan.id, "razorpay");
      const rzpKey =
        order.key_id ||
        (import.meta.env.VITE_RAZORPAY_KEY_ID as string) ||
        "rzp_test_TO2r0YMjDZSpuC";

      await openRazorpayCheckout(
        {
          key: rzpKey,
          amount:
            order.amount_minor ??
            (order.amount ? order.amount * 100 : plan.price_minor),
          currency: order.currency || "INR",
          name: "Creo Digital Marketing",
          description: `Subscription - ${plan.display_name}`,
          order_id: order.order_id?.startsWith("order_") ? order.order_id : undefined,
          prefill: {
            name: user?.full_name || undefined,
            email: user?.email || undefined,
          },
          theme: {
            color: "#7FA0D6",
          },
        },
        async (response) => {
          try {
            await confirmPayment(
              user.id,
              order.order_id,
              response.razorpay_payment_id || `pay_sandbox_${Date.now()}`,
              response.razorpay_signature || "sig_sandbox",
              "razorpay"
            );
          } catch (err: any) {
            console.warn("Payment confirmation notice:", err);
          }
          await queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
          setSuccessNotice(`Successfully switched plan to ${plan.display_name}!`);
          setProcessingPlanId(null);
          setTimeout(() => {
            onClose();
          }, 1500);
        },
        () => {
          setProcessingPlanId(null);
        }
      );
    } catch (err: any) {
      setErrorNotice(err.message || "Failed to initiate plan checkout.");
      setProcessingPlanId(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] rounded-3xl bg-[#161F2D] border border-[#2A3446] text-white shadow-2xl overflow-y-auto flex flex-col relative m-auto animate-in zoom-in-95 duration-200 p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2A3446]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-[#7FA0D6]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#97A0B3]">
                Plan Comparison & Upgrade
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Compare & Switch Plans
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Notices */}
        {errorNotice && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {errorNotice}
          </div>
        )}
        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Plans Grid */}
        {isPlansLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#7FA0D6]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans?.map((plan) => {
              const isCurrent =
                currentPlanName &&
                (currentPlanName.toLowerCase().includes(plan.name.toLowerCase()) ||
                  currentPlanName.toLowerCase().includes(plan.display_name.toLowerCase()));
              const isBusy = processingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "border-[#7FA0D6] bg-[#0B111C]/90 shadow-lg shadow-[#7FA0D6]/10 ring-1 ring-[#7FA0D6]"
                      : plan.is_recommended
                      ? "border-[#7FA0D6]/60 bg-[#161F2D]"
                      : "border-[#2A3446] bg-[#161F2D]/60 hover:border-[#7FA0D6]/40"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{plan.display_name}</h3>
                      {isCurrent ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#7FA0D6]/20 text-[#BCCCE6] border border-[#7FA0D6]/40">
                          Current Plan
                        </span>
                      ) : plan.is_recommended ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Recommended
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <span className="text-3xl font-extrabold text-white">
                        ₹{(plan.price_minor / 100).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-[#97A0B3] font-medium"> / month</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#2A3446]/60 text-center">
                      <div className="p-2 rounded-xl bg-[#0B111C]/60 border border-[#2A3446]">
                        <span className="text-xs font-bold text-[#7FA0D6] block">
                          {plan.reel_quota}
                        </span>
                        <span className="text-[10px] text-[#97A0B3]">Reels</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0B111C]/60 border border-[#2A3446]">
                        <span className="text-xs font-bold text-[#7FA0D6] block">
                          {plan.poster_quota}
                        </span>
                        <span className="text-[10px] text-[#97A0B3]">Posts</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0B111C]/60 border border-[#2A3446]">
                        <span className="text-xs font-bold text-[#7FA0D6] block">
                          {plan.story_quota}
                        </span>
                        <span className="text-[10px] text-[#97A0B3]">Stories</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-[#97A0B3] pt-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                        <span>{plan.revision_rounds} creative revision rounds</span>
                      </li>
                      {plan.highlights?.slice(0, 3).map((h, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-full bg-[#2A3446]/50 text-center text-xs font-bold text-[#97A0B3]">
                        Active Plan
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchPlan(plan)}
                        disabled={isBusy || !!processingPlanId}
                        className="w-full py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] hover:bg-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Zap className="size-3.5" />
                        )}
                        <span>Switch to {plan.display_name}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-[#2A3446] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#97A0B3]">
          <p>
            Need custom creative volumes, multi-brand billing, or annual retainer discounts?
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNegotiation("Custom Pricing / Retainer Discount");
            }}
            className="px-4 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#2A3446] text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 shrink-0"
          >
            <PhoneCall className="size-3.5 text-[#7FA0D6]" />
            <span>Request Custom Quote & Call</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
