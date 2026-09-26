import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { openRazorpayCheckout } from "../../lib/razorpay";
import { useAuth } from "../../lib/auth-context";
import {
  Download,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Star,
  Package,
  X,
  ArrowRight,
  RefreshCw,
  Calendar,
  Sparkles,
  Check,
  Lock,
  Film,
  Smartphone,
  Image as ImageIcon,
  AlertCircle,
  PhoneCall,
  Video,
  ExternalLink,
} from "lucide-react";
import { InvoiceModal } from "../../components/portal/InvoiceModal";
import { PlanBargainCallModal } from "../../components/portal/PlanBargainCallModal";
import { generateInvoicePDF, type InvoiceData } from "../../lib/pdf-invoice";

/* ─── Monotonic Timer Hook (Clock Tampering Resistant) ─────────────────────── */

function useMonotonicRetainerTimer(
  serverSecondsRemaining?: number,
  serverIsExpired?: boolean,
  onExpire?: () => void
) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(serverSecondsRemaining ?? 0);
  const [isExpired, setIsExpired] = useState<boolean>(serverIsExpired ?? false);

  useEffect(() => {
    if (serverIsExpired || serverSecondsRemaining === undefined || serverSecondsRemaining <= 0) {
      setIsExpired(serverIsExpired ?? false);
      setSecondsRemaining(serverSecondsRemaining ?? 0);
      return;
    }

    setSecondsRemaining(serverSecondsRemaining);
    setIsExpired(false);

    const startPerf = performance.now();
    const interval = setInterval(() => {
      // performance.now() is a monotonic counter immune to client OS clock manipulation
      const elapsedSeconds = Math.floor((performance.now() - startPerf) / 1000);
      const remaining = Math.max(0, serverSecondsRemaining - elapsedSeconds);
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [serverSecondsRemaining, serverIsExpired, onExpire]);

  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  return { secondsRemaining, isExpired, days, hours, minutes, seconds };
}

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
  isExpired = false,
  daysRemaining = 0,
  onSelect,
  onClose,
  onOpenAddon,
  onOpenBargain,
}: {
  plans: Plan[];
  currentPlanName?: string;
  currentPlanDisplayName?: string;
  currentPeriodEnd?: string | null;
  hasActiveSubscription?: boolean;
  isExpired?: boolean;
  daysRemaining?: number;
  onSelect: (plan: Plan) => void;
  onClose: () => void;
  onOpenAddon?: () => void;
  onOpenBargain?: () => void;
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
        backgroundColor: "rgba(5, 8, 16, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#161F2D] rounded-3xl shadow-2xl border border-[#2A3446] w-full max-w-5xl lg:max-w-6xl max-h-[96vh] overflow-y-auto lg:overflow-hidden p-4 sm:p-5 lg:p-6 relative my-auto transition-all animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)] text-[#F8FAFC]">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-60 rounded-full bg-[#7FA0D6]/10 blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 size-7 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#97A0B3] hover:text-white flex items-center justify-center transition-all cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        <div className="text-center mb-2.5 sm:mb-3 relative">
          <h2 className="text-xl sm:text-2xl font-black text-[#F8FAFC] tracking-tight">
            Choose Your Production Plan
          </h2>
          <p className="text-xs text-[#97A0B3] mt-0.5 max-w-md mx-auto">
            All plans include dedicated workspace, auto-publishing & guaranteed delivery.
          </p>
        </div>

        {/* Retainer Active Notice Banner */}
        {hasActiveSubscription && !isExpired && (
          <div className="mb-2.5 p-2.5 sm:p-3 rounded-2xl bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-left">
            <div className="flex items-start gap-2">
              <div className="size-6 rounded-lg bg-[#D8BF9B]/20 text-[#D8BF9B] flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="size-3" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#D8BF9B] flex items-center gap-2">
                  <span>Current Retainer Active: {currentPlanDisplayName || "Active Tier"}</span>
                  <span className="bg-[#D8BF9B]/20 text-[#D8BF9B] text-[10px] px-2 py-0.5 rounded-md font-semibold border border-[#D8BF9B]/30">
                    {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left
                  </span>
                </p>
                <p className="text-[11px] text-[#D8BF9B]/80 mt-0.5">
                  Your plan is active until <span className="font-semibold">{formattedExpiry || "renewal"}</span>.
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
                className="px-3 py-1 rounded-xl bg-[#BCCCE6] text-[#0B111C] hover:bg-white active:scale-95 text-xs font-bold shrink-0 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Package className="size-3.5" />
                Order Add-on Pack →
              </button>
            )}
          </div>
        )}

        {/* Retainer Expired Notice Banner */}
        {isExpired && (
          <div className="mb-2.5 p-2.5 sm:p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-left">
            <div className="flex items-start gap-2">
              <div className="size-6 rounded-xl bg-rose-900/50 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="size-3" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-300 flex items-center gap-2">
                  <span>Creative Retainer Cycle Expired</span>
                  <span className="bg-rose-900/60 text-rose-300 text-[10px] px-2 py-0.5 rounded-md font-semibold border border-rose-700/60">
                    Expired {formattedExpiry ? `on ${formattedExpiry}` : ""}
                  </span>
                </p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Select any plan below to renew your retainer and assign your creative pod.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-stretch">
          {realPlans.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            const isRecommended = plan.is_recommended;
            const price = plan.monthly_price || (plan.price_minor ? plan.price_minor / 100 : 25000);
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 h-full ${
                  isCurrent && hasActiveSubscription && !isExpired
                    ? "border-emerald-500/80 bg-[#161F2D] shadow-md shadow-emerald-500/10"
                    : isRecommended
                    ? "border-[#7FA0D6] bg-[#161F2D] shadow-lg shadow-[#7FA0D6]/15 ring-1 ring-[#7FA0D6]/30"
                    : "border-[#2A3446] bg-[#0B111C] hover:border-[#7FA0D6]/60 hover:shadow-md"
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#7FA0D6] text-[#0B111C] text-[9px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Star className="size-2 fill-[#0B111C] text-[#0B111C]" /> Most Popular
                  </span>
                )}
                {isCurrent && hasActiveSubscription && !isExpired && (
                  <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <Check className="size-2" /> Current Active
                  </span>
                )}
                {isCurrent && isExpired && (
                  <span className="absolute -top-2.5 right-3 bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <AlertCircle className="size-2" /> Cycle Ended
                  </span>
                )}

                <div className="flex-1 flex flex-col">
                  <div className="mb-0.5">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${
                      isCurrent && hasActiveSubscription && !isExpired ? "text-emerald-400" : "text-[#7FA0D6]"
                    }`}>
                      {plan.name === "pro" ? "Scale & Enterprise" : plan.name === "growth" ? "High Growth" : "Starter"}
                    </p>
                    <h3 className="text-lg sm:text-xl font-black text-[#F8FAFC] tracking-tight mt-0.5">
                      {plan.display_name}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2 pb-2 border-b border-[#2A3446]">
                    <span className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] font-medium text-[#97A0B3]">/ month</span>
                  </div>

                  {/* Monthly Quota Allocation Strip */}
                  <div className="rounded-xl bg-[#0B111C] border border-[#2A3446] p-2 mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7FA0D6] mb-1">
                      Monthly Production Allocation
                    </p>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="bg-[#161F2D] rounded-lg py-1 px-1 border border-[#2A3446]">
                        <p className="text-sm font-black text-[#F8FAFC]">{plan.poster_quota}</p>
                        <p className="text-[8px] text-[#97A0B3] font-medium">Posters</p>
                      </div>
                      <div className="bg-[#161F2D] rounded-lg py-1 px-1 border border-[#2A3446]">
                        <p className="text-sm font-black text-[#7FA0D6]">{plan.reel_quota}</p>
                        <p className="text-[8px] text-[#97A0B3] font-medium">Reels</p>
                      </div>
                      <div className="bg-[#161F2D] rounded-lg py-1 px-1 border border-[#2A3446]">
                        <p className="text-sm font-black text-[#F8FAFC]">{plan.story_quota}</p>
                        <p className="text-[8px] text-[#97A0B3] font-medium">Stories</p>
                      </div>
                    </div>
                  </div>

                  {/* Full Feature List */}
                  <ul className="space-y-1 mb-2 flex-1">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-1.5 text-[11px] text-[#F8FAFC] leading-tight">
                        <div className={`size-3 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent && hasActiveSubscription && !isExpired
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            : "bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/40"
                        }`}>
                          <Check className="size-2" />
                        </div>
                        <span>{h}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-1.5 text-[11px] font-medium text-[#F8FAFC] leading-tight">
                      <div className="size-3 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-800/60">
                        <Check className="size-2" />
                      </div>
                      <span>{plan.revision_rounds} revision round{plan.revision_rounds !== 1 ? "s" : ""} included</span>
                    </li>
                    {plan.has_dedicated_manager && (
                      <li className="flex items-start gap-1.5 text-[11px] font-semibold text-[#7FA0D6] leading-tight">
                        <div className="size-3 rounded-full bg-[#7FA0D6]/20 text-[#7FA0D6] flex items-center justify-center shrink-0 mt-0.5 border border-[#7FA0D6]/40">
                          <Check className="size-2" />
                        </div>
                        <span>Dedicated Brand Account Director</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-[#2A3446]">
                  {isCurrent && hasActiveSubscription && !isExpired ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 cursor-default"
                    >
                      <Check className="size-3" /> Current Active Plan
                    </button>
                  ) : hasActiveSubscription && !isExpired ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-[#0B111C] text-[#97A0B3] border border-[#2A3446] cursor-not-allowed"
                      title={`Locked until your current retainer cycle expires on ${formattedExpiry || "end of period"}`}
                    >
                      <Lock className="size-3" /> Locked Until Expiry
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelect(plan)}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-[#BCCCE6] hover:bg-white text-[#0B111C] shadow-md shadow-[#BCCCE6]/20"
                    >
                      {isCurrent && isExpired ? "Renew Retainer" : `Select ${plan.display_name}`} <ArrowRight className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bargain & Custom Pricing CTA in Plan Picker */}
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <PhoneCall className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Want custom deliverables or want to bargain pricing?
              </p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                Schedule a call with Creo Leadership to propose your budget and customize your agency retainer.
              </p>
            </div>
          </div>
          {onOpenBargain && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBargain();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shrink-0 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <PhoneCall className="size-3.5" />
              <span>Book Call to Bargain →</span>
            </button>
          )}
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
  hasActiveSubscription,
  currentPlanName,
  onOpenPlanPicker,
}: {
  onClose: () => void;
  onPurchase: (addon: AddonPackItem) => void;
  hasActiveSubscription: boolean;
  currentPlanName?: string;
  onOpenPlanPicker: () => void;
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

  const getAddonMicroTags = (type: "posters" | "reels" | "stories") => {
    switch (type) {
      case "posters":
        return ["1:1 & 4:5 Feed", "Brand DNA Matched"];
      case "reels":
        return ["Cinematic 9:16", "Audio Sync & Captions"];
      case "stories":
        return ["Daily 9:16 Frames", "Interactive Stickers"];
    }
  };

  // If user does not have an active subscription, show the locked state notice
  if (!hasActiveSubscription) {
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
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100/90 w-full max-w-md p-6 sm:p-8 relative my-auto animate-[zoomIn_0.22s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden text-center">
          {/* Top colored stripe */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          
          <button
            onClick={onClose}
            className="absolute top-5 right-5 size-9 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer z-10"
            aria-label="Close modal"
          >
            <X className="size-4.5" />
          </button>

          <div className="mx-auto size-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
            <Lock className="size-8 text-amber-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wide mb-2">
            <span>Retainer Required</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#0D2137] tracking-tight">
            Active Retainer Required
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Add-on packs give instant quota boosts to active monthly subscribers. Please activate a retainer plan first to unlock on-demand add-ons.
          </p>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPlanPicker();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] hover:from-[#246bb0] hover:to-[#174e7e] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="size-4 text-amber-300 fill-amber-300" />
              <span>Choose Production Plan →</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Active Subscriber View
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
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2B7BC4] via-[#6366F1] to-[#059669]" />

        {/* Ambient Radial Glows */}
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
        <div className="text-center mb-6 relative z-10">
          <div className="relative inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-tr from-[#1B5E9A] via-[#2B7BC4] to-[#54A4E5] p-0.5 shadow-lg shadow-blue-500/20 mb-3">
            <div className="size-full rounded-[14px] bg-white flex items-center justify-center text-[#2B7BC4]">
              <Package className="size-6 text-[#2B7BC4]" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50/90 border border-blue-200/70 text-[#2B7BC4] text-[11px] font-bold tracking-wide uppercase">
              <Sparkles className="size-3 text-[#2B7BC4]" />
              <span>On-Demand Quota Top-Up</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active: {currentPlanName || "Retainer Plan"}</span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#0D2137] tracking-tight">
            Order Add-on Pack
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            Instant creative quota added directly to your current monthly cycle.
          </p>
        </div>

        {/* Addon Pack Cards */}
        <div className="space-y-3 relative z-10">
          {ADDON_PACKS.map((addon) => {
            const microTags = getAddonMicroTags(addon.type);
            return (
              <div
                key={addon.id}
                className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all duration-200 group ${
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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {microTags.map((mt, i) => (
                        <span key={i} className="text-[11px] font-medium text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md">
                          {mt}
                        </span>
                      ))}
                    </div>
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
            );
          })}
        </div>

        {/* Footer Trust Indicator */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 relative z-10">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Instant Quota Credit</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <span className="font-semibold text-slate-500 tracking-tight">PCI-DSS Level 1 Certified</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export function PortalPaymentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [showBargainModal, setShowBargainModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const { data: dashboard } = useQuery({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: () => request<any>("/api/v1/portal/dashboard"),
    enabled: !!user?.id,
  });

  const { data } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["payment-plans"],
    queryFn: () => request<Plan[]>("/api/v1/payments/plans"),
  });

  const stage = dashboard?.onboarding_stage ?? user?.onboarding_stage ?? 1;
  const termsAccepted = dashboard?.terms_accepted ?? false;
  const isStep2Done = termsAccepted || stage >= 2;

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
    if (!isStep2Done) {
      setShowPlanModal(false);
      window.location.href = "/onboarding?step=2";
      return;
    }

    setShowPlanModal(false);
    setPaymentStatus("processing");

    try {
      const order = await createOrderMutation.mutateAsync(plan.id);

      await openRazorpayCheckout(
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
            order_id: payment.razorpay_order_id || order.order_id,
            payment_id: payment.razorpay_payment_id || `pay_sandbox_${Date.now()}`,
            signature: payment.razorpay_signature || `sig_sandbox_${Date.now()}`,
          });
        },
        () => {
          // User closed/exited checkout without completing payment
          setPaymentStatus("idle");
          queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
        }
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

  const { isExpired: timerExpired, days: liveDays } = useMonotonicRetainerTimer(
    data?.seconds_remaining,
    data?.is_expired,
    () => {
      queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
    }
  );

  const isExpired =
    timerExpired ||
    data?.is_expired === true ||
    data?.subscription?.status === "expired" ||
    data?.subscription?.status === "canceled";

  const isSubscribed =
    !isExpired &&
    (data?.is_active === true ||
      (!!data?.subscription && ["active", "trialing"].includes(data?.subscription?.status)));

  const brandDisplayName =
    (user as any)?.company_name || (dashboard as any)?.company_name || (dashboard as any)?.brand_name || user?.full_name || "Your Brand";

  interface DisplayInvoice {
    id: string;
    date: string;
    amount: string;
    status: string;
    plan: string;
  }

  const invoices: DisplayInvoice[] = (data?.invoices && Array.isArray(data.invoices)) ? data.invoices : [];

  const handleDownloadInvoice = (inv: DisplayInvoice) => {
    const invData: InvoiceData = {
      id: inv.id.replace("#", ""),
      date: inv.date,
      amount: inv.amount,
      status: inv.status,
      plan: inv.plan,
      clientName: user?.full_name || brandDisplayName,
      clientEmail: user?.email || "billing@client.com",
      companyName: brandDisplayName,
    };
    generateInvoicePDF(invData);
    showToast(`Downloaded tax receipt ${inv.id}`);
  };

  const cyclePeriodText = data?.subscription?.current_period_end
    ? `Current Billing Cycle: ${new Date(data?.subscription?.current_period_start || Date.now()).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} - ${new Date(data?.subscription?.current_period_end).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} • Renews ${new Date(data?.subscription?.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "Billing cycle inactive • Retainer required";

  return (
    <div className="relative animate-page-in space-y-5 max-w-[1440px] mx-auto px-4 md:px-8 pb-6 overflow-x-hidden">
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
          isExpired={isExpired}
          daysRemaining={liveDays ?? data?.days_remaining ?? 0}
          onSelect={handleSelectPlan}
          onClose={() => setShowPlanModal(false)}
          onOpenAddon={() => setShowAddonModal(true)}
          onOpenBargain={() => setShowBargainModal(true)}
        />
      )}
      <PlanBargainCallModal
        isOpen={showBargainModal}
        onClose={() => setShowBargainModal(false)}
      />
      {showAddonModal && (
        <AddonModal
          hasActiveSubscription={isSubscribed}
          currentPlanName={plan?.display_name}
          onClose={() => setShowAddonModal(false)}
          onPurchase={handleAddonPurchase}
          onOpenPlanPicker={() => {
            setShowAddonModal(false);
            setShowPlanModal(true);
          }}
        />
      )}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ── Payment Status Banner ─────────────────────────────────────────── */}
      {paymentStatus === "processing" && (
        <div className="flex items-center gap-3 bg-blue-50/90 border border-blue-200/80 rounded-2xl px-5 py-3.5 text-sm font-semibold text-blue-800 shadow-sm backdrop-blur-xs">
          <RefreshCw className="size-4.5 animate-spin text-blue-600 shrink-0" />
          <span>Opening secure checkout window...</span>
        </div>
      )}
      {paymentStatus === "success" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-2xl p-4 sm:px-6 sm:py-4.5 text-sm font-semibold text-emerald-950 shadow-md backdrop-blur-xs">
          <div className="flex items-center gap-3.5">
            <div className="size-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base text-emerald-950">
                Payment Confirmed & Retainer Active!
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                Next: Enter your brand details to synthesize your Brand Strategy DNA and dispatch your dedicated creative pod.
              </p>
            </div>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-amber-300" />
            <span>Generate Brand Strategy DNA →</span>
          </Link>
        </div>
      )}
      {paymentStatus === "error" && (
        <div className="flex items-center gap-3 bg-red-50/90 border border-red-200/80 rounded-2xl px-5 py-3.5 text-sm font-semibold text-red-800 shadow-sm backdrop-blur-xs">
          <X className="size-4.5 text-red-600 shrink-0" />
          <span>Payment was cancelled or could not be processed. Please try again.</span>
        </div>
      )}

      {/* ── Service Agreement Required Banner (if step 2 not done) ──────── */}
      {!isStep2Done && (
        <div className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 p-5 sm:p-6 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm backdrop-blur-xs">
          <div className="flex items-start gap-4">
            <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <AlertCircle className="size-5.5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                  Step 2 Required
                </span>
                <h3 className="text-sm sm:text-base font-bold text-amber-950">
                  Service Agreement Required Before Payment
                </h3>
              </div>
              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed max-w-2xl">
                You must review and accept our Master Service Agreement terms in account setup before selecting a plan and activating your creative retainer.
              </p>
            </div>
          </div>
          <Link
            to="/onboarding?step=2"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all shrink-0 cursor-pointer"
          >
            <span>Resume Setup (Step 2: Agreement)</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* ── 2-Column Bento Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column (7 cols) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Retainer Plan Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Top Left Badge */}
              {isSubscribed ? (
                <div className="flex sm:inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold tracking-wide">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="break-words text-center sm:text-left">• ACTIVE • {(plan?.display_name || data?.plan?.display_name || "GROWTH TIER").toUpperCase()}</span>
                </div>
              ) : (
                <div className="flex sm:inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold tracking-wide">
                  <span className="size-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="break-words text-center sm:text-left">• INACTIVE • NO ACTIVE RETAINER</span>
                </div>
              )}

              {/* Top Right Price */}
              <div className="text-left sm:text-right shrink-0">
                <div className="flex items-baseline sm:justify-end gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-[#0052FF] tracking-tight">
                    {isSubscribed
                      ? (plan?.monthly_price ? "₹" + Number(plan.monthly_price).toLocaleString("en-IN") : data?.plan?.price_minor ? "₹" + (data.plan.price_minor / 100).toLocaleString("en-IN") : "₹0")
                      : "₹0"}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">/mo</span>
                </div>
                {isSubscribed ? (
                  <p className="text-[11px] sm:text-xs font-semibold text-emerald-600 flex items-center sm:justify-end gap-1 mt-0.5">
                    <Check className="size-3.5 text-emerald-600" />
                    <span>Unlimited revisions included</span>
                  </p>
                ) : (
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-400 flex items-center sm:justify-end gap-1 mt-0.5">
                    <span>Retainer plan required</span>
                  </p>
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mt-5 sm:mt-6">
              <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                {isSubscribed ? (plan?.display_name || data?.plan?.display_name || "Creative Retainer") : "No Active Retainer Plan"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-xl">
                {isSubscribed
                  ? `Dedicated creative execution & weekly production sprints for ${brandDisplayName}.`
                  : `You do not have an active production retainer. Select a plan to assign your dedicated creative squad and unlock production sprints.`}
              </p>
            </div>

            {/* Billing Cycle Pill or Select Plan CTA */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {isSubscribed ? (
                <div className="flex sm:inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-600 font-medium">
                  <Calendar className="size-3.5 text-slate-400 shrink-0" />
                  <span className="break-words">{cyclePeriodText}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="size-3.5" />
                  <span>Choose a Retainer Plan</span>
                  <ArrowRight className="size-3.5 ml-0.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Production Capacity & Sprint Allocation */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Production Capacity & Sprint Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time resource utilization across creative workflows
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100/80 border border-slate-200/80 px-3 py-1 rounded-full shrink-0">
                {isSubscribed ? "Active Sprint" : "Inactive"}
              </span>
            </div>

            {/* Capacity Meter Box */}
            <div className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-[#0052FF]" />
                  <span className="font-bold text-slate-900">Sprint Production Quota</span>
                </div>
                <span className="font-bold text-slate-900">{isSubscribed ? "124 / 160 hrs used" : "0 / 0 hrs used"}</span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0052FF] transition-all duration-700 ease-out"
                  style={{ width: isSubscribed ? "77.5%" : "0%" }}
                />
              </div>

              <p className="text-xs text-slate-500 font-medium">
                {isSubscribed
                  ? "36 hours remaining in current billing cycle (Resets automatically in 12 days)."
                  : "Production capacity and sprint hours unlock upon activating your monthly retainer."}
              </p>
            </div>
          </div>

          {/* 3. Enterprise Tier Included Perks */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Enterprise Tier Included Perks
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                High-impact execution benefits active on your current retainer
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
              {/* Perk 1 */}
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all flex items-start gap-3.5 group">
                <div className="size-9 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Zap className="size-4.5 fill-amber-400 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Dedicated Creative Pod</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Full-stack unit: Pod Lead, Motion Designer, Lead Copywriter, Ad Strategist.
                  </p>
                </div>
              </div>

              {/* Perk 2 */}
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all flex items-start gap-3.5 group">
                <div className="size-9 rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="size-4.5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">2-Hour SLA Triage Guarantee</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Priority ticketing queue with rapid response times & senior engineer escalation.
                  </p>
                </div>
              </div>

              {/* Perk 3 */}
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all flex items-start gap-3.5 group">
                <div className="size-9 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <RefreshCw className="size-4.5 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Unlimited Revisions</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Iterative weekly review cycles with zero surprise fees or change order costs.
                  </p>
                </div>
              </div>

              {/* Perk 4 */}
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all flex items-start gap-3.5 group">
                <div className="size-9 rounded-xl bg-orange-50 border border-orange-200/60 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Package className="size-4.5 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">4K Motion & Vector Delivery</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Uncompressed source deliverables, Figma master systems, and native 3D files.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Configured Add-Ons */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Configured Add-Ons
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modular execution enhancements active on your retainer.
                </p>
              </div>
              {isSubscribed && (
                <button
                  type="button"
                  onClick={() => setShowAddonModal(true)}
                  className="text-xs font-bold text-[#0052FF] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer"
                  title="Manage add-on packs"
                >
                  Manage Add-ons
                </button>
              )}
            </div>

            <div className="space-y-3 mt-5">
              {!isSubscribed ? (
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-6 text-center">
                  <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2.5">
                    <Zap className="size-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">No active add-ons</h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Modular 4K motion renders, emergency SLA queues, and extra credits can be added once your retainer plan is active.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Add-on 1 */}
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-3.5 sm:p-4 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="size-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                        <Video className="size-4.5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          4K Motion &amp; Animation Sprint
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          3x 30s 3D motion renders / mo
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                        ₹10,000 / mo <span className="size-1.5 rounded-full bg-emerald-500" />
                      </span>
                    </div>
                  </div>

                  {/* Add-on 2 */}
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-3.5 sm:p-4 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="size-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
                        <Zap className="size-4.5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          24h Priority Turnaround SLA
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Expedited production queue access
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                        ₹5,000 / mo <span className="size-1.5 rounded-full bg-emerald-500" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Tax Invoices & Billing Receipts */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tax Invoices & Billing Receipts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download official tax receipts and monthly VAT statements.
                </p>
              </div>
              {invoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(true)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
                >
                  View Full Archive →
                </button>
              )}
            </div>

            <div className="space-y-3 mt-5">
              {invoices.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-6 text-center">
                  <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2.5">
                    <FileText className="size-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">No invoices yet</h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Official tax receipts, GST/VAT statements, and PDF invoices will appear here after your first billing cycle.
                  </p>
                </div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-3 sm:p-3.5 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-2xs group-hover:text-slate-600 transition-colors">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{inv.id}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {inv.date} • {inv.amount}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(inv)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0052FF] hover:text-[#0045D8] px-3 py-1.5 rounded-xl border border-blue-100 bg-white hover:bg-blue-50/60 transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95"
                    >
                      <span>Download PDF</span>
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* ── Full Archive Modal ────────────────────────────────────────────── */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF]">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Billing History & Tax Statements</h3>
                  <p className="text-xs text-slate-500">Official GST-compliant tax invoices and receipts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {invoices.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FileText className="size-8 mx-auto mb-2 opacity-40 text-slate-300" />
                  <p className="text-xs font-semibold">No tax receipts or invoices found.</p>
                </div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="size-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{inv.id}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {inv.date} • {inv.amount} • {inv.plan}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(inv)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0052FF] hover:text-[#0045D8] px-3.5 py-2 rounded-xl border border-blue-100 bg-white hover:bg-blue-50 transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Download className="size-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-500">
                <ShieldCheck className="size-4 text-emerald-500" />
                Digitally signed & verified by Creo Finance Ltd.
              </span>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 ml-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
