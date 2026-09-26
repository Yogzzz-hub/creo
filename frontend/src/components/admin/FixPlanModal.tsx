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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#050810]/80 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-[#2A3446] text-[#F1F5F9] max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 size-8 rounded-full bg-[#1F2C3F] text-[#97A0B3] hover:bg-[#25344A] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-5 pb-4 border-b border-[#2A3446]">
          <div className="size-10 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6] flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Fix & Customise Retainer Plan
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 text-[#7FA0D6] px-2 py-0.5 text-[10px] font-bold">
                <ShieldCheck className="size-3" /> Secure Billing
              </span>
            </div>
            <p className="text-xs text-[#97A0B3] mt-0.5">
              Client: <strong className="text-[#F1F5F9]">{client.company_name || client.email}</strong> •{" "}
              {client.plan_name ? `Current: ${client.plan_name}` : "No active plan"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Tab Switcher: Standard Presets vs Custom Bargained Package */}
        <div className="flex items-center p-1 bg-[#0B111C] border border-[#2A3446] rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "presets"
                ? "bg-[#161F2D] text-white shadow-xs border border-[#2A3446]"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            <Sparkles className="size-3.5 text-[#7FA0D6]" />
            <span>Standard Retainer Presets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "custom"
                ? "bg-[#161F2D] text-white shadow-xs border border-[#2A3446]"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            <Sliders className="size-3.5 text-[#7FA0D6]" />
            <span>Custom / Bargained Package</span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-[#D8BF9B]/20 border border-[#D8BF9B]/30 text-[#D8BF9B] text-[9px] font-extrabold ml-1">
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
                        ? "border-[#7FA0D6] bg-[#0B111C] shadow-xs ring-2 ring-[#7FA0D6]/30"
                        : "border-[#2A3446] hover:border-[#7FA0D6]/50 bg-[#0B111C]"
                    }`}
                  >
                    {preset.isPopular && (
                      <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-[#BCCCE6] text-[#0B111C] px-2 py-0.5 text-[9px] font-black uppercase shadow-2xs tracking-wider">
                        Recommended
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="font-bold text-xs text-white">{preset.name}</h4>
                        {isCurrent && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-1.5 py-0.2 rounded-md">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="font-extrabold text-sm text-[#F1F5F9] mb-2">{preset.priceStr}</p>

                      {/* Quota Highlights */}
                      <div className="space-y-1.5 text-[11px] text-[#97A0B3] border-t border-[#2A3446] pt-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Film className="size-3 text-[#7FA0D6]" />
                          <span>
                            <strong className="text-white">{preset.reels}</strong> Reels / mo
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="size-3 text-[#7FA0D6]" />
                          <span>
                            <strong className="text-white">{preset.posters}</strong> Posters / mo
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="size-3 text-[#7FA0D6]" />
                          <span>
                            <strong className="text-white">{preset.stories}</strong> Stories / mo
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#2A3446]">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreset(preset.id);
                        }}
                        className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#BCCCE6] text-[#0B111C] shadow-xs"
                            : "bg-[#161F2D] text-[#F1F5F9] hover:bg-[#1F2C3F] border border-[#2A3446]"
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
                        className="w-full py-1 text-[11px] text-[#7FA0D6] hover:text-[#BCCCE6] font-semibold hover:underline flex items-center justify-center gap-1 cursor-pointer"
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
              <label className="block text-xs font-semibold text-[#97A0B3]">
                Admin Notes (Audit Trail)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Standard preset fixed upon client onboarding call."
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM / BARGAINED PACKAGE */}
        {activeTab === "custom" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0B111C] border border-[#2A3446] flex items-start gap-3">
              <div className="size-8 rounded-xl bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] flex items-center justify-center shrink-0 mt-0.5">
                <PhoneCall className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  Negotiated Retainer Agreement (Strategy Call)
                </h4>
                <p className="text-[11px] text-[#97A0B3] mt-0.5">
                  Customize the exact deliverables (reels, posters, stories) and monthly subscription price agreed with the client. The client will be charged this exact rate and their usage counters will immediately reflect these quotas.
                </p>
              </div>
            </div>

            {/* Custom Plan Name & Monthly Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#97A0B3] mb-1">
                  Custom Plan Title
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Custom Growth Retainer"
                  className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs font-medium text-[#F1F5F9] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#97A0B3] mb-1">
                  Agreed Monthly Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-[#97A0B3]">₹</span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] pl-7 pr-3 py-2 text-xs font-extrabold text-[#F1F5F9] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
                  />
                </div>
                {/* Price Suggestion Chips */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-[#97A0B3]">Quick:</span>
                  {[30000, 35000, 42000, 60000, 75000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomPrice(amt)}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#0B111C] border border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9] cursor-pointer"
                    >
                      ₹{amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Quota Counters */}
            <div className="p-3.5 rounded-2xl border border-[#2A3446] bg-[#0B111C] space-y-3">
              <span className="text-xs font-bold text-white block">
                Deliverable Monthly Quotas (Reels, Posters, Stories)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Reels */}
                <div className="bg-[#161F2D] p-3 rounded-xl border border-[#2A3446] shadow-2xs">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1">
                      <Film className="size-3 text-[#7FA0D6]" /> Reels
                    </span>
                    <span className="text-[10px] text-[#97A0B3] font-semibold">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCustomReels((prev) => Math.max(0, prev - 1))}
                      className="size-7 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:bg-[#1F2C3F] flex items-center justify-center text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-base font-black text-white">{customReels}</span>
                    <button
                      type="button"
                      onClick={() => setCustomReels((prev) => prev + 1)}
                      className="size-7 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:bg-[#1F2C3F] flex items-center justify-center text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Static Posters */}
                <div className="bg-[#161F2D] p-3 rounded-xl border border-[#2A3446] shadow-2xs">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1">
                      <ImageIcon className="size-3 text-[#7FA0D6]" /> Posters
                    </span>
                    <span className="text-[10px] text-[#97A0B3] font-semibold">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCustomPosters((prev) => Math.max(0, prev - 1))}
                      className="size-7 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:bg-[#1F2C3F] flex items-center justify-center text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-base font-black text-white">{customPosters}</span>
                    <button
                      type="button"
                      onClick={() => setCustomPosters((prev) => prev + 1)}
                      className="size-7 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:bg-[#1F2C3F] flex items-center justify-center text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Stories */}
                <div className="bg-[#161F2D] p-3 rounded-xl border border-[#2A3446] shadow-2xs">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1">
                      <Smartphone className="size-3 text-[#7FA0D6]" /> Stories
                    </span>
                    <span className="text-[10px] text-[#97A0B3] font-semibold">/ month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCustomStories((prev) => Math.max(0, prev - 1))}
                      className="size-7 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:bg-[#1F2C3F] flex items-center justify-center text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="text-base font-black text-white">{customStories}</span>
                    <button
                      type="button"
                      onClick={() => setCustomStories((prev) => prev + 1)}
                      className="size-7 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:bg-[#1F2C3F] flex items-center justify-center text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Negotiation Details */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#97A0B3]">
                Negotiation Notes & Call Summary
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Client negotiated on strategy call: agreed rate ₹40,000/mo for 10 reels + 12 posters."
                className="w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
              />
              <p className="text-[10px] text-[#97A0B3]">
                🔒 Security Note: Changes will be recorded in the audit log and client portal billing. The client cannot modify or tamper with their assigned rate.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 mt-5 border-t border-[#2A3446]">
          <div className="text-xs text-[#97A0B3] font-medium">
            {activeTab === "presets" ? (
              <span>
                Fixing as: <strong className="text-white">{PRESETS.find((p) => p.id === selectedPreset)?.name}</strong>
              </span>
            ) : (
              <span>
                Negotiated: <strong className="text-white">₹{Number(customPrice || 0).toLocaleString("en-IN")}/mo</strong> ({customReels} Reels, {customPosters} Posters, {customStories} Stories)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#97A0B3] hover:text-white hover:bg-[#1F2C3F] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-[#BCCCE6] hover:bg-[#D4E2F5] text-[#0B111C] text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
