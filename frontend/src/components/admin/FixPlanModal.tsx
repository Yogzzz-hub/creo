import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Smartphone,
  Loader2,
  Sliders,
  ShieldCheck,
  PhoneCall,
  Plus,
  Minus,
} from "lucide-react";
import { fixClientPlan } from "../../lib/ops-api";
import type { ClientRosterItem } from "../../types/ops";

interface FixPlanModalProps {
  isOpen: boolean;
  client: ClientRosterItem | null;
  onClose: () => void;
  onSuccess: (planDisplayName: string) => void;
}

interface PlanPreset {
  id: "starter" | "growth" | "pro";
  name: string;
  priceNum: number;
  priceStr: string;
  reels: number;
  posters: number;
  stories: number;
  highlight: string;
  isPopular?: boolean;
}

const PRESETS: PlanPreset[] = [
  {
    id: "starter",
    name: "Starter Growth",
    priceNum: 25000,
    priceStr: "₹25,000 / mo",
    reels: 4,
    posters: 8,
    stories: 10,
    highlight: "1 Shoot Day • Basic Auto-dispatch",
  },
  {
    id: "growth",
    name: "Brand Accelerator",
    priceNum: 50000,
    priceStr: "₹50,000 / mo",
    reels: 8,
    posters: 15,
    stories: 20,
    highlight: "Dedicated Director • Weekly Matrix",
    isPopular: true,
  },
  {
    id: "pro",
    name: "Enterprise Domination",
    priceNum: 95000,
    priceStr: "₹95,000 / mo",
    reels: 16,
    posters: 30,
    stories: 40,
    highlight: "Senior VFX Director • 2 Shoot Days • 24h SLA",
  },
];

export function FixPlanModal({ isOpen, client, onClose, onSuccess }: FixPlanModalProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");
  const [selectedPreset, setSelectedPreset] = useState<"starter" | "growth" | "pro">("growth");

  // Custom bargain fields
  const [customName, setCustomName] = useState("Custom Retainer");
  const [customPrice, setCustomPrice] = useState<number>(40000);
  const [customReels, setCustomReels] = useState<number>(10);
  const [customPosters, setCustomPosters] = useState<number>(12);
  const [customStories, setCustomStories] = useState<number>(15);
  const [customNotes, setCustomNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (client) {
      const planNorm = (client.plan_name || "").toLowerCase();
      if (planNorm.includes("starter")) {
        setSelectedPreset("starter");
      } else if (planNorm.includes("enterprise") || planNorm.includes("pro")) {
        setSelectedPreset("pro");
      } else {
        setSelectedPreset("growth");
      }
      setCustomName(
        client.company_name
          ? `Negotiated Plan - ${client.company_name}`
          : "Negotiated Custom Retainer"
      );
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const currentPlanNormalized = (client.plan_name || "").toLowerCase();

  const handleCustomizeFromPreset = (preset: PlanPreset) => {
    setCustomName(`${preset.name} (Negotiated)`);
    setCustomPrice(preset.priceNum);
    setCustomReels(preset.reels);
    setCustomPosters(preset.posters);
    setCustomStories(preset.stories);
    setActiveTab("custom");
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "presets") {
        const preset = PRESETS.find((p) => p.id === selectedPreset);
        const res = await fixClientPlan(client.client_id, {
          plan_name: selectedPreset,
          custom_notes: customNotes || undefined,
          is_custom: false,
        });
        onSuccess(res.plan_display_name || preset?.name || selectedPreset);
      } else {
        // Validation
        if (!customPrice || customPrice <= 0) {
          throw new Error("Please enter a valid monthly price (greater than ₹0).");
        }
        if (customReels < 0 || customPosters < 0 || customStories < 0) {
          throw new Error("Quotas cannot be negative numbers.");
        }

        const res = await fixClientPlan(client.client_id, {
          plan_name: "custom",
          is_custom: true,
          custom_price: customPrice,
          custom_reel_quota: customReels,
          custom_poster_quota: customPosters,
          custom_story_quota: customStories,
          custom_display_name: customName || "Custom Retainer",
          custom_notes: customNotes || "Bargained / Booked Call Agreement",
        });

        onSuccess(res.plan_display_name || customName);
      }

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
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-[#C9DFF0] max-h-[92vh] overflow-y-auto">
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#0D2137] tracking-tight">
                Fix & Customise Retainer Plan
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                <ShieldCheck className="size-3" /> Secure Billing
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <strong className="text-[#0D2137]">{client.company_name || client.email}</strong> •{" "}
              {client.plan_name ? `Current: ${client.plan_name}` : "No active plan"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Tab Switcher: Standard Presets vs Custom Bargained Package */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "presets"
                ? "bg-white text-[#0D2137] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="size-3.5 text-[#2B7BC4]" />
            <span>Standard Retainer Presets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "custom"
                ? "bg-white text-[#0D2137] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="size-3.5 text-[#2B7BC4]" />
            <span>Custom / Bargained Package</span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold ml-1">
              Call Agmt
            </span>
          </button>
        </div>

        {/* TAB 1: STANDARD PRESETS */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {PRESETS.map((preset) => {
                const isCurrent =
                  currentPlanNormalized.includes(preset.id) ||
                  (preset.id === "growth" && currentPlanNormalized.includes("accelerator")) ||
                  (preset.id === "pro" && currentPlanNormalized.includes("enterprise"));

                const isSelected = selectedPreset === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`relative flex flex-col justify-between rounded-2xl p-4 border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#2B7BC4] bg-[#E8F4FD]/40 shadow-xs ring-2 ring-[#2B7BC4]/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {preset.isPopular && (
                      <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-[#2B7BC4] px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-2xs tracking-wider">
                        Recommended
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="font-bold text-xs text-[#0D2137]">{preset.name}</h4>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="font-extrabold text-sm text-[#0D2137] mb-2">{preset.priceStr}</p>

                      {/* Quota Highlights */}
                      <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Film className="size-3 text-[#2B7BC4]" />
                          <span>
                            <strong className="text-[#0D2137]">{preset.reels}</strong> Reels / mo
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="size-3 text-[#2B7BC4]" />
                          <span>
                            <strong className="text-[#0D2137]">{preset.posters}</strong> Posters / mo
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="size-3 text-[#2B7BC4]" />
                          <span>
                            <strong className="text-[#0D2137]">{preset.stories}</strong> Stories / mo
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100/80">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreset(preset.id);
                        }}
                        className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#2B7BC4] text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <CheckCircle2 className="size-3" />
                        <span>Select {preset.id === "starter" ? "Starter" : preset.id === "growth" ? "Growth" : "Pro"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCustomizeFromPreset(preset);
                        }}
                        className="w-full py-1 text-[11px] text-[#2B7BC4] hover:text-[#1E609A] font-semibold hover:underline flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Sliders className="size-2.5" />
                        <span>Customise quotas & price</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Negotiation Note */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0D2137]">
                Admin Notes (Audit Trail)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Standard preset fixed upon client onboarding call."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4]"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM / BARGAINED PACKAGE */}
        {activeTab === "custom" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/60 to-slate-50 border border-[#C9DFF0] flex items-start gap-3">
              <div className="size-8 rounded-xl bg-[#2B7BC4] text-white flex items-center justify-center shrink-0 mt-0.5">
                <PhoneCall className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0D2137]">
                  Negotiated Retainer Agreement (Strategy Call)
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Customize the exact deliverables (reels, posters, stories) and monthly subscription price agreed with the client. The client will be charged this exact rate and their usage counters will immediately reflect these quotas.
                </p>
              </div>
            </div>

            {/* Custom Plan Name & Monthly Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#0D2137] mb-1">
                  Custom Plan Title
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Custom Growth Retainer"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0D2137] mb-1">
                  Agreed Monthly Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2 text-xs font-extrabold text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4]"
                  />
                </div>
                {/* Price Suggestion Chips */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Quick:</span>
                  {[30000, 35000, 42000, 60000, 75000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomPrice(amt)}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      ₹{amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Quota Counters */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <span className="text-xs font-bold text-[#0D2137] block">
                Deliverable Monthly Quotas (Reels, Posters, Stories)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Reels */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-[#0D2137] flex items-center gap-1">
                      <Film className="size-3 text-[#2B7BC4]" /> Reels
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCustomReels((prev) => Math.max(0, prev - 1))}
                      className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-base font-black text-[#0D2137]">{customReels}</span>
                    <button
                      type="button"
                      onClick={() => setCustomReels((prev) => prev + 1)}
                      className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Static Posters */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-[#0D2137] flex items-center gap-1">
                      <ImageIcon className="size-3 text-[#2B7BC4]" /> Posters
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCustomPosters((prev) => Math.max(0, prev - 1))}
                      className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-base font-black text-[#0D2137]">{customPosters}</span>
                    <button
                      type="button"
                      onClick={() => setCustomPosters((prev) => prev + 1)}
                      className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Stories */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-[#0D2137] flex items-center gap-1">
                      <Smartphone className="size-3 text-[#2B7BC4]" /> Stories
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCustomStories((prev) => Math.max(0, prev - 1))}
                      className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-base font-black text-[#0D2137]">{customStories}</span>
                    <button
                      type="button"
                      onClick={() => setCustomStories((prev) => prev + 1)}
                      className="size-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Negotiation Details */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0D2137]">
                Negotiation Notes & Call Summary
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Client negotiated on strategy call: agreed rate ₹40,000/mo for 10 reels + 12 posters."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4]"
              />
              <p className="text-[10px] text-slate-400">
                🔒 Security Note: Changes will be recorded in the audit log and client portal billing. The client cannot modify or tamper with their assigned rate.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium">
            {activeTab === "presets" ? (
              <span>
                Fixing as: <strong>{PRESETS.find((p) => p.id === selectedPreset)?.name}</strong>
              </span>
            ) : (
              <span>
                Negotiated: <strong>₹{Number(customPrice || 0).toLocaleString("en-IN")}/mo</strong> ({customReels} Reels, {customPosters} Posters, {customStories} Stories)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
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
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-[#2B7BC4] hover:bg-[#1E609A] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              <span>
                {activeTab === "custom"
                  ? "Lock & Apply Custom Plan"
                  : "Confirm & Fix Selected Plan"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
