import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Sparkles,
  PhoneCall,
} from "lucide-react";

interface ComparePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  onOpenNegotiation: (topic: string) => void;
}

interface PlanTier {
  id: string;
  name: string;
  price: string;
  unitCost: string;
  reels: number;
  posts: number;
  stories: number;
  sla: string;
  revisions: string;
  lead: string;
  badge?: string;
  isPopular?: boolean;
}

const TIERS: PlanTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "₹25,000",
    unitCost: "₹1,136 / asset",
    reels: 4,
    posts: 8,
    stories: 10,
    sla: "3 business days SLA",
    revisions: "1 revision round per asset",
    lead: "Shared account lead",
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹50,000",
    unitCost: "₹1,041 / asset",
    reels: 10,
    posts: 18,
    stories: 20,
    sla: "2 business days SLA",
    revisions: "2 revision rounds per asset",
    lead: "Dedicated account director",
    badge: "Most Popular",
    isPopular: true,
  },
  {
    id: "pro",
    name: "Scale",
    price: "₹95,000",
    unitCost: "₹989 / asset",
    reels: 20,
    posts: 36,
    stories: 40,
    sla: "24-hour priority SLA",
    revisions: "3 revision rounds per asset",
    lead: "Executive creative director & priority pod",
    badge: "Maximum Output",
  },
];

export function ComparePlansModal({
  isOpen,
  onClose,
  currentPlanName,
  onOpenNegotiation,
}: ComparePlansModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const normCurrent = (currentPlanName || "Growth").toLowerCase();

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] grid place-items-center p-4 sm:p-6 overflow-y-auto bg-black/80 animate-[fadeIn_0.15s_ease-out]"
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl bg-nebula-surface p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-nebula-steel max-h-[92vh] overflow-y-auto text-slate-50 m-auto animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 size-8 rounded-full bg-nebula-navy border border-nebula-steel text-nebula-mist hover:bg-nebula-steel hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nebula-glow/10 border border-nebula-glow/30 text-nebula-periwinkle text-xs font-semibold mb-2">
            <Sparkles className="size-3.5 text-nebula-glow" />
            <span>Retainer Tiers & Capacity</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Compare Retainer Plans
          </h2>
          <p className="text-xs text-nebula-mist mt-1.5 leading-relaxed">
            Switch plans seamlessly for your upcoming cycle or request tailored volume for your brand.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {TIERS.map((tier) => {
            const isCurrent = normCurrent.includes(tier.id);
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                  isCurrent
                    ? "bg-nebula-navy border-nebula-glow shadow-[0_0_25px_rgba(127,160,214,0.15)] ring-1 ring-nebula-glow"
                    : tier.isPopular
                      ? "bg-nebula-navy/60 border-nebula-sand/40 hover:border-nebula-sand"
                      : "bg-nebula-navy/40 border-nebula-steel hover:border-nebula-steel"
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-bold text-white tracking-tight">
                    {tier.name}
                  </span>
                  {isCurrent ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-nebula-glow text-nebula-navy text-[10px] font-extrabold uppercase tracking-wider">
                      Current Plan
                    </span>
                  ) : tier.badge ? (
                    <span className="px-2 py-0.5 rounded-full bg-nebula-sand/20 border border-nebula-sand/40 text-nebula-sand text-[10px] font-bold">
                      {tier.badge}
                    </span>
                  ) : null}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{tier.price}</span>
                    <span className="text-xs text-nebula-mist">/month</span>
                  </div>
                  <p className="text-[11px] text-nebula-glow mt-0.5 font-medium">{tier.unitCost}</p>
                </div>

                {/* Quotas */}
                <div className="space-y-2 py-3 border-y border-nebula-steel/80 text-xs mb-4">
                  <div className="flex justify-between items-center text-nebula-periwinkle">
                    <span>Reels / Shorts</span>
                    <span className="font-bold text-white">{tier.reels}</span>
                  </div>
                  <div className="flex justify-between items-center text-nebula-periwinkle">
                    <span>Static Posts / Carousels</span>
                    <span className="font-bold text-white">{tier.posts}</span>
                  </div>
                  <div className="flex justify-between items-center text-nebula-periwinkle">
                    <span>Stories / Slides</span>
                    <span className="font-bold text-white">{tier.stories}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 text-[11px] text-nebula-mist mb-5 flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{tier.revisions}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{tier.sla}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{tier.lead}</span>
                  </li>
                </ul>

                {/* Action CTA */}
                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl border border-nebula-glow/40 bg-nebula-glow/10 text-xs font-bold text-nebula-periwinkle cursor-default text-center"
                    >
                      Active Tier
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNegotiation(`Switch plan to ${tier.name}`);
                      }}
                      className="w-full py-2.5 rounded-xl bg-nebula-periwinkle hover:bg-white text-nebula-navy text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Switch to {tier.name}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Negotiation Banner */}
        <div className="rounded-2xl border border-nebula-steel bg-nebula-navy p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-nebula-surface border border-nebula-steel text-nebula-glow flex items-center justify-center shrink-0">
              <PhoneCall className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Need higher reel volume or custom terms?</p>
              <p className="text-[11px] text-nebula-mist">
                Talk with our Agency Director to customize quotas, SLA speed, or multi-brand packages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNegotiation("Custom Pricing / Retainer Discount");
            }}
            className="px-4 py-2 rounded-xl border border-nebula-glow/40 bg-nebula-glow/10 text-nebula-periwinkle hover:bg-nebula-glow/20 text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Negotiate Custom Plan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
