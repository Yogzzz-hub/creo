import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { openRazorpayCheckout } from "../../lib/razorpay";
import {
  Download,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Crown,
  FileText,
  Star,
  Package,
  X,
  ArrowRight,
  RefreshCw,
  CreditCard,
  Calendar,
  Sparkles,
  TrendingUp,
  Check,
  Lock,
  Film,
  Smartphone,
  Image as ImageIcon,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_minor: number;
  currency: string;
  monthly_price: number;
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
  revision_rounds: number;
  has_dedicated_manager: boolean;
  highlights: string[];
  is_recommended: boolean;
  is_active: boolean;
}

interface CreateOrderResponse {
  subscription_id: string;
  gateway: string;
  order_id: string;
  amount_minor: number;
  currency: string;
  key_id: string;
}

/* ─── Plan Picker Modal (Portaled to document.body) ───────────────────────── */

function PlanPickerModal({
  plans,
  currentPlanName,
  currentPlanDisplayName,
  currentPeriodEnd,
  hasActiveSubscription = false,
  onSelect,
  onClose,
  onOpenAddon,
}: {
  plans: Plan[];
  currentPlanName?: string;
  currentPlanDisplayName?: string;
  currentPeriodEnd?: string | null;
  hasActiveSubscription?: boolean;
  onSelect: (plan: Plan) => void;
  onClose: () => void;
  onOpenAddon?: () => void;
}) {
  const realPlans = plans.filter((p) =>
    ["starter", "growth", "pro"].includes(p.name)
  );

  const formattedExpiry = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const daysRemaining = currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]"
      style={{
        backgroundColor: "rgba(10, 22, 40, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl p-6 sm:p-8 relative my-auto transition-all animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-60 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 size-9 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="size-4.5" />
        </button>

        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-3">
            <Sparkles className="size-3.5 text-blue-600" />
            <span>Transparent Creative Retainers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0D2137] tracking-tight">
            Choose Your Production Plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            All plans include dedicated workspace, Instagram auto-publishing & guaranteed on-time creative delivery.
          </p>
        </div>

        {/* Retainer Active Notice Banner (Option 1) */}
        {hasActiveSubscription && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950 flex items-center gap-2">
                  <span>Current Retainer Active: {currentPlanDisplayName || "Active Tier"}</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                    {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left
                  </span>
                </p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Your plan is active until <span className="font-semibold">{formattedExpiry || "renewal"}</span>. To prevent duplicate billing, plan switching unlocks after this cycle ends.
                </p>
              </div>
            </div>
            {onOpenAddon && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddon();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Package className="size-3.5" />
                Order Add-on Pack →
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {realPlans.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            const isRecommended = plan.is_recommended;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                  isCurrent
                    ? "border-emerald-500/80 bg-gradient-to-b from-emerald-50/40 via-white to-white shadow-lg shadow-emerald-500/10"
                    : isRecommended
                    ? "border-[#2B7BC4] bg-gradient-to-b from-[#2B7BC4]/8 via-[#2B7BC4]/3 to-white shadow-xl shadow-[#2B7BC4]/15"
                    : "border-slate-200 bg-white hover:border-[#2B7BC4]/60 hover:shadow-lg shadow-xs"
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#2B7BC4] to-[#1F5C96] text-white text-[10px] font-bold px-3.5 py-1 rounded-full flex items-center gap-1 shadow-md shadow-blue-600/30">
                    <Star className="size-3 fill-amber-300 text-amber-300" /> Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3.5 right-4 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Check className="size-3" /> Current Active
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? "text-emerald-700" : "text-[#2B7BC4]"}`}>
                      {plan.display_name}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-black text-[#0D2137] tracking-tight">
                      ₹{(plan.price_minor / 100).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-medium text-slate-500">/ month</span>
                  </div>

                  <div className="h-px w-full bg-slate-100 mb-4" />

                  <ul className="space-y-2.5 mb-6">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <div className={`size-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-[#2B7BC4]"
                        }`}>
                          <Check className="size-3" />
                        </div>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                  >
                    <Check className="size-3.5" /> Current Active Plan
                  </button>
                ) : hasActiveSubscription ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    title={`Locked until your current retainer cycle expires on ${formattedExpiry || "end of period"}`}
                  >
                    <Lock className="size-3.5" /> Locked Until Expiry
                  </button>
                ) : (
                  <button
                    onClick={() => onSelect(plan)}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isRecommended
                        ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white hover:from-[#246bb0] hover:to-[#174e7e] shadow-md shadow-blue-500/25 active:scale-[0.98]"
                        : "border-2 border-[#2B7BC4] text-[#2B7BC4] hover:bg-[#2B7BC4]/10 active:scale-[0.98]"
                    }`}
                  >
                    Select Plan <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Add-on Pack Modal (Portaled to document.body) ───────────────────────── */

interface AddonPackItem {
  id: string;
  name: string;
  tag: string;
  badge?: string;
  description: string;
  price_minor: number;
  currency: string;
  type: "posters" | "reels" | "stories";
  unitLabel: string;
}

const ADDON_PACKS: AddonPackItem[] = [
  {
    id: "addon-posters-5",
    name: "5 Extra Posters",
    tag: "Static Creatives",
    description: "High-converting 1:1 feed and carousel assets tailored to your visual brand identity",
    price_minor: 250000, // ₹2,500
    currency: "INR",
    type: "posters",
    unitLabel: "+5 Static Posts",
  },
  {
    id: "addon-reels-3",
    name: "3 Extra Reels",
    tag: "Cinematic 9:16",
    badge: "Most Popular",
    description: "Dynamic vertical video edits with pacing, hook transitions, trending audio & captions",
    price_minor: 450000, // ₹4,500
    currency: "INR",
    type: "reels",
    unitLabel: "+3 Short-Form Reels",
  },
  {
    id: "addon-stories-10",
    name: "10 Extra Stories",
    tag: "Interactive Stories",
    description: "Daily engagement 9:16 story frames with sticker layouts, highlights & flash promos",
    price_minor: 200000, // ₹2,000
    currency: "INR",
    type: "stories",
    unitLabel: "+10 Story Drops",
  },
];

function AddonModal({
  onClose,
  onPurchase,
}: {
  onClose: () => void;
  onPurchase: (addon: AddonPackItem) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const getAddonIcon = (type: "posters" | "reels" | "stories") => {
    switch (type) {
      case "posters":
        return (
          <div className="relative size-12 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 text-amber-600 border border-amber-500/25 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-amber-500/15 transition-all">
            <ImageIcon className="size-5.5 text-amber-600" />
            <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shadow-2xs">
              +5
            </span>
          </div>
        );
      case "reels":
        return (
          <div className="relative size-12 rounded-2xl bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-purple-500/5 text-indigo-600 border border-indigo-500/25 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-indigo-500/15 transition-all">
            <Film className="size-5.5 text-indigo-600" />
            <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shadow-2xs">
              +3
            </span>
          </div>
        );
      case "stories":
        return (
          <div className="relative size-12 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-blue-500/5 text-[#2B7BC4] border border-blue-500/25 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-blue-500/15 transition-all">
            <Smartphone className="size-5.5 text-[#2B7BC4]" />
            <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-[#2B7BC4] text-white text-[9px] font-black flex items-center justify-center shadow-2xs">
              +10
            </span>
          </div>
        );
    }
  };

  const getAddonBadge = (type: "posters" | "reels" | "stories") => {
    switch (type) {
      case "posters":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "reels":
        return "bg-violet-50 text-indigo-700 border-indigo-200/80";
      case "stories":
        return "bg-sky-50 text-sky-700 border-sky-200/80";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]"
      style={{
        backgroundColor: "rgba(10, 22, 40, 0.7)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100/90 w-full max-w-xl p-6 sm:p-8 relative my-auto animate-[zoomIn_0.22s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-0 size-60 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 size-9 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="size-4.5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-7 relative z-10">
          <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-tr from-[#1B5E9A] via-[#2B7BC4] to-[#54A4E5] p-0.5 shadow-lg shadow-blue-500/20 mb-3">
            <div className="size-full rounded-[14px] bg-white flex items-center justify-center text-[#2B7BC4]">
              <Package className="size-6 text-[#2B7BC4]" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50/90 border border-blue-200/70 text-[#2B7BC4] text-[11px] font-bold tracking-wide uppercase">
              <Sparkles className="size-3 text-[#2B7BC4]" />
              <span>On-Demand Quota Top-Up</span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#0D2137] tracking-tight">
            Order Add-on Pack
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            Need extra content this billing cycle? Instantly boost your monthly quota with verified production drops.
          </p>
        </div>

        {/* Addon Pack Cards */}
        <div className="space-y-3.5 relative z-10">
          {ADDON_PACKS.map((addon) => (
            <div
              key={addon.id}
              className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl border transition-all duration-200 group ${
                addon.badge
                  ? "border-[#2B7BC4]/40 bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/20 shadow-sm hover:border-[#2B7BC4] hover:shadow-md hover:shadow-blue-500/10"
                  : "border-slate-200/90 bg-white hover:border-[#2B7BC4]/80 hover:bg-blue-50/20 shadow-xs hover:shadow-sm"
              }`}
            >
              {/* Popular Badge */}
              {addon.badge && (
                <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#2B7BC4] to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Star className="size-2.5 fill-amber-300 text-amber-300" />
                  <span>{addon.badge}</span>
                </div>
              )}

              {/* Left: Icon + Info */}
              <div className="flex items-start sm:items-center gap-3.5">
                {getAddonIcon(addon.type)}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#0D2137] tracking-tight group-hover:text-[#2B7BC4] transition-colors">
                      {addon.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getAddonBadge(
                        addon.type
                      )}`}
                    >
                      {addon.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal max-w-sm">
                    {addon.description}
                  </p>
                </div>
              </div>

              {/* Right: Price + Action Button */}
              <div className="flex items-center justify-between sm:justify-end gap-3.5 mt-3 sm:mt-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                <div className="text-left sm:text-right">
                  <div className="text-base font-black text-[#0D2137] tracking-tight">
                    ₹{(addon.price_minor / 100).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    one-time
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPurchase(addon)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold rounded-xl hover:from-[#3586d1] hover:to-[#2368a5] shadow-sm shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="size-3 text-amber-300 fill-amber-300" />
                  <span>Buy Now</span>
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Trust Indicator */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 relative z-10">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Instant Quota Top-Up · 256-Bit Encrypted Checkout</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <span>Powered by</span>
            <span className="font-extrabold text-[#0D2137] tracking-tight">Razorpay</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export function PortalPaymentsPage() {
  const queryClient = useQueryClient();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  const { data, isLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["payment-plans"],
    queryFn: () => request<Plan[]>("/api/v1/payments/plans"),
  });

  const createOrderMutation = useMutation({
    mutationFn: (planId: string) =>
      request<CreateOrderResponse>("/api/v1/payments/orders", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId, gateway: "razorpay" }),
      }),
  });

  const confirmMutation = useMutation({
    mutationFn: (body: {
      order_id: string;
      payment_id: string;
      signature: string;
    }) =>
      request<{ status: string; subscription_id: string }>(
        "/api/v1/payments/confirm",
        {
          method: "POST",
          body: JSON.stringify({ ...body, gateway: "razorpay" }),
        }
      ),
    onSuccess: () => {
      setPaymentStatus("success");
      queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
      setTimeout(() => setPaymentStatus("idle"), 4000);
    },
    onError: () => setPaymentStatus("error"),
  });

  const handleSelectPlan = async (plan: Plan) => {
    setShowPlanModal(false);
    setPaymentStatus("processing");

    try {
      const order = await createOrderMutation.mutateAsync(plan.id);

      openRazorpayCheckout(
        {
          key: order.key_id,
          amount: order.amount_minor,
          currency: order.currency,
          name: "Creo Platform",
          description: `${plan.display_name} — Monthly Retainer`,
          order_id: order.order_id,
          theme: { color: "#2B7BC4" },
        },
        async (payment) => {
          await confirmMutation.mutateAsync({
            order_id: payment.razorpay_order_id,
            payment_id: payment.razorpay_payment_id,
            signature: payment.razorpay_signature,
          });
        },
        () => setPaymentStatus("idle")
      );
    } catch {
      setPaymentStatus("error");
    }
  };

  const handleAddonPurchase = async (addon: typeof ADDON_PACKS[0]) => {
    setShowAddonModal(false);
    setPaymentStatus("processing");

    // For add-ons, we create a simple Razorpay order directly
    try {
      const res = await request<{ order_id: string; key_id: string }>(
        "/api/v1/payments/addon-order",
        {
          method: "POST",
          body: JSON.stringify({
            addon_id: addon.id,
            amount_minor: addon.price_minor,
            currency: addon.currency,
          }),
        }
      );

      openRazorpayCheckout(
        {
          key: res.key_id,
          amount: addon.price_minor,
          currency: addon.currency,
          name: "Creo Platform",
          description: addon.name,
          order_id: res.order_id,
          theme: { color: "#2B7BC4" },
        },
        () => {
          setPaymentStatus("success");
          queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
          setTimeout(() => setPaymentStatus("idle"), 3000);
        },
        () => setPaymentStatus("idle")
      );
    } catch {
      setPaymentStatus("error");
    }
  };

  const plan = data?.plan;
  const quotas = data?.quotas || {};
  const isSubscribed =
    !!data?.subscription &&
    ["active", "trialing"].includes(data?.subscription?.status);

  const posterUsed = quotas["static_post"]?.used ?? 0;
  const posterTotal =
    quotas["static_post"]?.quota ??
    (isSubscribed ? plan?.poster_quota ?? 0 : 0);
  const posterPct =
    posterTotal > 0
      ? Math.min(100, Math.round((posterUsed / posterTotal) * 100))
      : 0;

  const reelUsed = quotas["reel"]?.used ?? 0;
  const reelTotal =
    quotas["reel"]?.quota ??
    (isSubscribed ? plan?.reel_quota ?? 0 : 0);
  const reelPct =
    reelTotal > 0
      ? Math.min(100, Math.round((reelUsed / reelTotal) * 100))
      : 0;

  const storyUsed = quotas["carousel"]?.used ?? 0;
  const storyTotal =
    quotas["carousel"]?.quota ??
    (isSubscribed ? plan?.story_quota ?? 0 : 0);
  const storyPct =
    storyTotal > 0
      ? Math.min(100, Math.round((storyUsed / storyTotal) * 100))
      : 0;

  const invoices = (data?.invoices as Array<{
    id: string;
    date: string;
    amount: string;
    status: string;
    plan: string;
  }>) || [];

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-12">
      {/* ── Ambient Background Lighting ─────────────────────────────────── */}
      <div className="pointer-events-none absolute -top-16 -left-16 size-[480px] rounded-full bg-blue-400/10 blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-1/3 -right-20 size-[520px] rounded-full bg-sky-300/10 blur-3xl -z-10" />

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showPlanModal && (
        <PlanPickerModal
          plans={plans}
          currentPlanName={plan?.name}
          currentPlanDisplayName={plan?.display_name}
          currentPeriodEnd={data?.subscription?.current_period_end}
          hasActiveSubscription={isSubscribed}
          onSelect={handleSelectPlan}
          onClose={() => setShowPlanModal(false)}
          onOpenAddon={() => setShowAddonModal(true)}
        />
      )}
      {showAddonModal && (
        <AddonModal
          onClose={() => setShowAddonModal(false)}
          onPurchase={handleAddonPurchase}
        />
      )}

      {/* ── Payment Status Banner ─────────────────────────────────────────── */}
      {paymentStatus === "processing" && (
        <div className="flex items-center gap-3 bg-blue-50/90 border border-blue-200/80 rounded-2xl px-5 py-3.5 text-sm font-semibold text-blue-800 shadow-sm backdrop-blur-xs">
          <RefreshCw className="size-4.5 animate-spin text-blue-600 shrink-0" />
          <span>Opening secure Razorpay checkout modal...</span>
        </div>
      )}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl px-5 py-3.5 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur-xs">
          <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
          <span>Payment successfully confirmed! Your creative subscription is live.</span>
        </div>
      )}
      {paymentStatus === "error" && (
        <div className="flex items-center gap-3 bg-red-50/90 border border-red-200/80 rounded-2xl px-5 py-3.5 text-sm font-semibold text-red-800 shadow-sm backdrop-blur-xs">
          <X className="size-4.5 text-red-600 shrink-0" />
          <span>Payment was cancelled or could not be processed. Please try again.</span>
        </div>
      )}

      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <CreditCard className="size-3.5" />
            <span>Retainer & Billing Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0D2137] tracking-tight">
            Subscription & Quota Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Monitor real-time monthly production quotas, manage your active retainer, and download verified GST invoices.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddonModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#2B7BC4] hover:text-[#2B7BC4] hover:bg-blue-50/30 transition-all shadow-xs cursor-pointer"
          >
            <Package className="size-3.5" />
            Add-on Pack
          </button>
          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:from-[#246bb0] hover:to-[#174e7e] active:scale-95 transition-all cursor-pointer"
          >
            {isSubscribed ? <Crown className="size-3.5" /> : <Zap className="size-3.5" />}
            {isSubscribed ? "Current Plan Details" : "Activate Retainer Plan"}
          </button>
        </div>
      </div>

      {/* ── Metric Highlights Strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/90 border border-slate-200/80 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Retainer</p>
            <p className="text-lg font-black text-[#0D2137] mt-0.5">
              {data?.subscription ? (plan?.display_name || "Growth Retainer") : "None (Pending Payment)"}
            </p>
          </div>
          <div className="size-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2B7BC4]">
            <Crown className="size-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 border border-slate-200/80 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Quota</p>
            <p className="text-lg font-black text-[#0D2137] mt-0.5">
              {data?.subscription ? `${posterUsed + reelUsed + storyUsed} / ${posterTotal + reelTotal + storyTotal} Assets` : "0 / 0 Assets"}
            </p>
          </div>
          <div className="size-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp className="size-5" />
          </div>
        </div>


        <div className="rounded-2xl bg-white/90 border border-slate-200/80 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing Security</p>
            <p className="text-lg font-black text-[#0D2137] mt-0.5">Razorpay 256-Bit</p>
          </div>
          <div className="size-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="size-5" />
          </div>
        </div>
      </div>

      {/* ── Plan Summary & Quota Meters ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Plan Card */}
        <div className="lg:col-span-5 rounded-3xl border border-blue-100/90 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 p-7 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
          {/* Subtle Ambient Accent */}
          <div className="absolute -top-12 -right-12 size-36 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200/70 rounded-full w-1/2" />
              <div className="h-10 bg-slate-200/70 rounded-2xl w-3/4" />
              <div className="h-20 bg-slate-100 rounded-2xl w-full" />
            </div>
          ) : data?.subscription ? (
            <>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#2B7BC4] flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                    <Crown className="size-3.5 text-[#2B7BC4]" />
                    Active Plan
                  </span>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1 font-bold flex items-center gap-1.5 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Retainer
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl font-black text-[#0D2137] tracking-tight">
                    {plan?.display_name || "Growth Tier"}
                  </h2>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-2xl font-extrabold text-[#0D2137]">
                      ₹{((plan?.price_minor || 0) / 100).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">/ month + GST</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-white/80 border border-slate-200/60 p-3.5 rounded-2xl">
                  Dedicated brand squad producing {posterTotal} static posters, {reelTotal} cinematic reels, and {storyTotal} story creatives per month.
                </p>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-full bg-blue-50 text-[#2B7BC4] flex items-center justify-center shrink-0">
                      <Check className="size-3" />
                    </div>
                    <span className="font-medium">Dedicated Creative Director & Manager</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-full bg-blue-50 text-[#2B7BC4] flex items-center justify-center shrink-0">
                      <Check className="size-3" />
                    </div>
                    <span className="font-medium">Automated Multi-Platform Publishing</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-full bg-blue-50 text-[#2B7BC4] flex items-center justify-center shrink-0">
                      <Check className="size-3" />
                    </div>
                    <span className="font-medium">{plan?.revision_rounds ?? 2} Fast Revision Rounds Per Asset</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400" />
                  {data?.subscription?.current_period_end
                    ? `Next renewal: ${new Date(data.subscription.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Automatic monthly retainer renewal"}
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  Auto-Renewal Active
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="size-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2B7BC4] shadow-xs">
                <Package className="size-7" />
              </div>
              <div>
                <p className="text-base font-bold text-[#0D2137]">No Active Subscription</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Activate a high-impact creative plan to unlock your workspace and dedicated creative team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold rounded-2xl hover:from-[#246bb0] hover:to-[#174e7e] shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Zap className="size-3.5" />
                Choose Production Plan
              </button>
            </div>
          )}
        </div>

        {/* Quota Gauges Card */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#0D2137]">Monthly Production Quota</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status of deliverable generation for this cycle</p>
            </div>
            {isSubscribed && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Refreshes in 30 days
              </span>
            )}
          </div>

          {isSubscribed ? (
            <>
              {/* Meter 1: Posters */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2B7BC4]">
                      <ImageIcon className="size-3.5" />
                    </span>
                    <span className="text-slate-800 font-bold">Static Brand Posters</span>
                  </div>
                  <span className="text-[#0D2137] font-mono font-bold">
                    {posterUsed} / {posterTotal} ({posterPct}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2B7BC4] to-[#0EA5E9] transition-all duration-500 shadow-xs"
                    style={{ width: `${posterPct}%` }}
                  />
                </div>
              </div>

              {/* Meter 2: Reels */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-[#6366F1]">
                      <Film className="size-3.5" />
                    </span>
                    <span className="text-slate-800 font-bold">Cinematic 9:16 Reels</span>
                  </div>
                  <span className="text-[#0D2137] font-mono font-bold">
                    {reelUsed} / {reelTotal} ({reelPct}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] transition-all duration-500 shadow-xs"
                    style={{ width: `${reelPct}%` }}
                  />
                </div>
              </div>

              {/* Meter 3: Stories */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-[#EC4899]">
                      <Smartphone className="size-3.5" />
                    </span>
                    <span className="text-slate-800 font-bold">Story Creatives & Interactive Polls</span>
                  </div>
                  <span className="text-[#0D2137] font-mono font-bold">
                    {storyUsed} / {storyTotal} ({storyPct}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#F43F5E] transition-all duration-500 shadow-xs"
                    style={{ width: `${storyPct}%` }}
                  />
                </div>
              </div>

              {/* Add-on CTA Callout */}
              <div className="pt-2 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-4 rounded-2xl border border-blue-100/80 shadow-2xs">
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <div className="size-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-[#2B7BC4] shrink-0">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0D2137]">Need extra deliverables before renewal?</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Top up quota anytime with instant Razorpay add-on packs.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddonModal(true)}
                  className="text-xs font-bold text-[#2B7BC4] hover:text-[#1F5C96] bg-white border border-blue-200 px-3.5 py-2 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0 ml-3"
                >
                  Order Add-on →
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="size-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Package className="size-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No Active Production Quota</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Activate a monthly retainer to generate static posters, cinematic reels, and interactive stories.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Invoices & Billing History Table ─────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#0D2137]">Official Tax Invoices & Receipts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Download official GST-compliant payment receipts and transaction records</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/70 px-3 py-1 rounded-full">
            {invoices.length} Invoices Available
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60 rounded-xl">
                <th className="py-3.5 px-4 rounded-l-xl">Invoice ID</th>
                <th className="py-3.5 px-4">Billing Date</th>
                <th className="py-3.5 px-4">Plan / Tier</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right rounded-r-xl">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    <div className="size-12 rounded-2xl bg-slate-50 border border-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-2">
                      <FileText className="size-6" />
                    </div>
                    <p className="font-semibold text-slate-700">No billing invoices recorded yet.</p>
                    <button
                      type="button"
                      onClick={() => setShowPlanModal(true)}
                      className="text-[#2B7BC4] font-bold mt-1.5 inline-block hover:underline"
                    >
                      Subscribe to a plan to start production →
                    </button>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-4 font-mono text-xs font-bold text-[#0D2137] flex items-center gap-2.5">
                      <FileText className="size-4 text-slate-400 group-hover:text-[#2B7BC4] transition-colors" />
                      {inv.id}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-slate-600">{inv.date}</td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-800">{inv.plan}</td>
                    <td className="py-4 px-4 text-xs font-extrabold text-[#0D2137]">{inv.amount}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold border inline-flex items-center gap-1.5 ${
                          inv.status === "Paid" || inv.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => alert(`Downloading invoice ${inv.id}...`)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2B7BC4] hover:text-[#1F5C96] bg-blue-50/70 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition-all cursor-pointer"
                      >
                        <Download className="size-3.5" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
