import { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Smartphone,
  Loader2,
} from "lucide-react";
import { fixClientPlan } from "../../lib/ops-api";
import type { ClientRosterItem } from "../../types/ops";

interface FixPlanModalProps {
  isOpen: boolean;
  client: ClientRosterItem | null;
  onClose: () => void;
  onSuccess: (planDisplayName: string) => void;
}

interface PlanOption {
  id: "starter" | "growth" | "pro";
  name: string;
  price: string;
  reels: number;
  posters: number;
  stories: number;
  revisions: number;
  highlight: string;
  isPopular?: boolean;
}

const PLANS: PlanOption[] = [
  {
    id: "starter",
    name: "Starter Growth",
    price: "₹25,000 / mo",
    reels: 4,
    posters: 8,
    stories: 10,
    revisions: 1,
    highlight: "1 Shoot Day • Basic Auto-dispatch",
  },
  {
    id: "growth",
    name: "Brand Accelerator",
    price: "₹50,000 / mo",
    reels: 8,
    posters: 15,
    stories: 20,
    revisions: 2,
    highlight: "Dedicated Director • Weekly Matrix",
    isPopular: true,
  },
  {
    id: "pro",
    name: "Enterprise Domination",
    price: "₹95,000 / mo",
    reels: 16,
    posters: 30,
    stories: 40,
    revisions: 3,
    highlight: "Senior VFX Director • 2 Shoot Days • 24h SLA",
  },
];

export function FixPlanModal({ isOpen, client, onClose, onSuccess }: FixPlanModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "growth" | "pro">("growth");
  const [customNotes, setCustomNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !client) return null;

  const currentPlanNormalized = (client.plan_name || "").toLowerCase();

  const handleFixPlan = async (planId: "starter" | "growth" | "pro") => {
    try {
      setLoading(true);
      setError(null);
      const res = await fixClientPlan(client.client_id, planId, customNotes || undefined);
      onSuccess(res.plan_display_name || planId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fix plan for client.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#C9DFF0] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 size-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#0D2137] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-5 pb-4 border-b border-slate-100">
          <div className="size-10 rounded-2xl bg-[#E8F4FD] border border-[#C9DFF0] text-[#2B7BC4] flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0D2137] tracking-tight">
              Fix Retainer Plan for Client
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign or change the active monthly subscription tier for{" "}
              <span className="font-semibold text-[#0D2137]">
                {client.company_name || client.email}
              </span>
              . Deliverable quotas will immediately synchronize.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* 3 Plans Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
          {PLANS.map((plan) => {
            const isCurrent =
              currentPlanNormalized.includes(plan.id) ||
              (plan.id === "growth" && currentPlanNormalized.includes("accelerator")) ||
              (plan.id === "pro" && currentPlanNormalized.includes("enterprise"));

            const isSelected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative flex flex-col justify-between rounded-2xl p-4 border transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#2B7BC4] bg-[#E8F4FD]/40 shadow-xs ring-2 ring-[#2B7BC4]/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                {/* Popular Pill */}
                {plan.isPopular && (
                  <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-[#2B7BC4] px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-2xs tracking-wider">
                    Recommended
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-[#0D2137]">{plan.name}</h4>
                    {isCurrent && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="font-extrabold text-sm text-[#0D2137] mb-2">{plan.price}</p>

                  {/* Quota Highlights */}
                  <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Film className="size-3 text-[#2B7BC4]" />
                      <span>
                        <strong className="text-[#0D2137]">{plan.reels}</strong> Reels
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="size-3 text-[#2B7BC4]" />
                      <span>
                        <strong className="text-[#0D2137]">{plan.posters}</strong> Static Posters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="size-3 text-[#2B7BC4]" />
                      <span>
                        <strong className="text-[#0D2137]">{plan.stories}</strong> Stories
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 italic mb-3 leading-tight">
                    {plan.highlight}
                  </p>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFixPlan(plan.id);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#2B7BC4] text-white hover:bg-[#1E609A] shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {loading && selectedPlan === plan.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    <span>Fix as {plan.id === "starter" ? "Starter" : plan.id === "growth" ? "Accelerator" : "Enterprise"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Notes / Bargain Agreement */}
        <div className="space-y-1.5 mb-5">
          <label className="block text-xs font-semibold text-[#0D2137]">
            Negotiation & Bargain Notes (Optional)
          </label>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="e.g. Negotiated on strategy call: agreed rate ₹42,000/mo or custom quota"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4]"
          />
          <p className="text-[10px] text-slate-400">
            Recorded in the audit trail. The client will be notified in their portal dashboard immediately.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleFixPlan(selectedPlan)}
            className="px-5 py-2 rounded-xl bg-[#2B7BC4] hover:bg-[#1E609A] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            <span>Confirm & Fix Selected Plan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
