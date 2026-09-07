import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  Building2,
  Users,
  Palette,
  Check,
  Globe,
  Instagram,
  ShieldAlert,
  Edit3,
} from "lucide-react";

import { fetchBrandDNAStatus, submitQuestionnaire, completeOnboarding } from "../../lib/onboarding-api";
import type { AssignedTeamMember, BrandDNA, QuestionnairePayload } from "../../types/api";

interface StageQuestionnaireProps {
  userId: string;
  onComplete: (assignedTeam?: AssignedTeamMember[]) => void;
}

const INDUSTRY_OPTIONS = [
  "Tech & SaaS",
  "E-Commerce & D2C",
  "Fashion & Apparel",
  "Health & Wellness",
  "Finance & FinTech",
  "Real Estate & Construction",
  "Food & Hospitality",
  "Creative Agency & Media",
  "Education & EdTech",
  "Professional Services",
  "Other",
];

const TONE_OPTIONS = [
  "Bold",
  "Professional",
  "Playful",
  "Luxurious",
  "Minimalist",
  "Educational",
  "Inspirational",
  "Warm",
  "Authoritative",
  "Witty",
  "High-Energy",
  "Aesthetic & Editorial",
];

const GOAL_OPTIONS = [
  "Brand Awareness",
  "Lead Generation",
  "Sales & Conversions",
  "Community Building",
  "Content Engagement",
  "Event Promotion",
  "Thought Leadership",
];

const CONTENT_FOCUS_OPTIONS = [
  "High-Retention Reels (9:16)",
  "Educational Carousels (4:5)",
  "Viral Stories (9:16)",
  "Promotional Posters (1:1 / 4:5)",
  "Motion Graphics & Teasers",
];

const PRESET_PALETTES = [
  { name: "Executive Blue", colors: ["#0D2137", "#2B7BC4", "#E8F4FD", "#F59E0B"] },
  { name: "Forest Emerald", colors: ["#064E3B", "#059669", "#A7F3D0", "#111827"] },
  { name: "Midnight Luxury", colors: ["#0F172A", "#D97706", "#FBBF24", "#F8FAFC"] },
  { name: "Neon Cyber", colors: ["#09090B", "#8B5CF6", "#EC4899", "#06B6D4"] },
];

function ColorSwatch({ color, onRemove }: { color: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white border border-[#C9DFF0] rounded-lg px-2.5 py-1 text-xs shadow-2xs">
      <div
        className="size-4 rounded-full border border-black/10 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-[11px] font-bold text-[#0D2137]">{color.toUpperCase()}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[#64748B] hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
        aria-label={`Remove ${color}`}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function BrandDNACard({
  dna,
  onEdit,
  onConfirmDispatch,
  isDispatching,
}: {
  dna: BrandDNA;
  onEdit: () => void;
  onConfirmDispatch: () => void;
  isDispatching: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border-2 border-[#2B7BC4]/30 bg-gradient-to-br from-white via-[#F8FAFC] to-[#EFF6FF] p-6 sm:p-8 shadow-lg text-left"
    >
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#C9DFF0]/60">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-[#2B7BC4] to-[#1A5EA8] flex items-center justify-center text-white shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-extrabold text-lg sm:text-xl text-[#0D2137]">
                Synthesized Gemini Brand DNA
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI Verified
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Formulated via Google Gemini AI • Ready for Pod Dispatch
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          disabled={isDispatching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2B7BC4] bg-white border border-[#C9DFF0] rounded-xl hover:bg-[#F0F7FD] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Edit3 className="size-3.5" />
          <span>Edit Brand Details</span>
        </button>
      </div>

      {/* Strategic Summary Line */}
      <div className="mt-5 p-4 rounded-xl bg-white border border-[#C9DFF0]/80 shadow-2xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2B7BC4] block mb-1.5">
          Core Brand Positioning
        </span>
        <p className="text-sm sm:text-base font-semibold text-[#0D2137] leading-relaxed">
          &ldquo;{dna.ai_summary_line ?? dna.summary}&rdquo;
        </p>
      </div>

      {/* Grid: Audience Persona & Goal Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="p-4 rounded-xl bg-white border border-[#C9DFF0]/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
            Target Audience Persona
          </span>
          <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
            {dna.audience_persona || dna.target_audience}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#C9DFF0]/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
            Strategic Goal Alignment
          </span>
          <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
            {dna.goal_alignment ||
              "Content velocity and creative formats are strictly calibrated to drive top-of-funnel reach and sustainable conversions."}
          </p>
        </div>
      </div>

      {/* Content Pillars */}
      {dna.content_themes && dna.content_themes.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-white border border-[#C9DFF0]/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
            Recommended Content Pillars
          </span>
          <div className="flex flex-wrap gap-2">
            {dna.content_themes.map((theme) => (
              <span
                key={theme}
                className="px-3 py-1 rounded-lg bg-[#F0F7FD] border border-[#C9DFF0] text-[#0D2137] text-xs font-semibold"
              >
                🎯 {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Visual Tone & Formats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#C9DFF0]/60">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
            Voice & Tone
          </span>
          <p className="text-xs font-bold text-[#0D2137]">{dna.tone}</p>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
            Brand Palette
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {dna.palette.map((c) => (
              <div
                key={c}
                title={c}
                className="size-6 rounded-md border border-black/10 shadow-2xs transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
            Target Formats
          </span>
          <div className="flex gap-1 flex-wrap">
            {dna.recommended_formats.map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 rounded-full bg-[#E8F4FD] text-[#2B7BC4] font-bold text-[10px]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Dispatch CTA */}
      <div className="mt-8 pt-6 border-t border-[#C9DFF0]/60 text-center">
        <button
          id="confirm-brand-dna-btn"
          type="button"
          onClick={onConfirmDispatch}
          disabled={isDispatching}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-xl bg-gradient-to-r from-[#2B7BC4] via-[#1F68A9] to-[#144F88] text-white font-bold text-sm sm:text-base hover:brightness-110 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        >
          {isDispatching ? (
            <>
              <RefreshCw className="size-5 animate-spin" />
              <span>Running FWB-FCS Algorithm & Assigning Creative Pod…</span>
            </>
          ) : (
            <>
              <span>Confirm Brand DNA & Dispatch Dedicated Creative Pod</span>
              <ArrowRight className="size-5" />
            </>
          )}
        </button>
        <p className="text-[11px] text-[#64748B] mt-2.5">
          Algorithm assigns: Team Lead (Min-WIP Round-Robin) + Lead Video Editor + Lead Graphic Designer
        </p>
      </div>
    </motion.div>
  );
}

export function StageQuestionnaire({ userId, onComplete }: StageQuestionnaireProps) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<QuestionnairePayload>({
    company_name: "",
    industry: "Tech & SaaS",
    official_logo_assets: "",
    website_url: "",
    business_description: "",
    instagram_username: "",
    primary_goal: "Brand Awareness",
    target_audience: "",
    audience_age_range: "25–38",
    audience_gender: "All Genders",
    audience_location: "Pan-India / Metros",
    audience_problems_solved: "",
    tone_keywords: ["Bold", "Professional"],
    color_palette: ["#0D2137", "#2B7BC4", "#059669"],
    content_goals: ["Brand Awareness", "Content Engagement"],
    style_references: [],
    competitors: [],
    content_focus: ["High-Retention Reels (9:16)", "Educational Carousels (4:5)"],
    topics_to_avoid: "",
  });

  const [colorInput, setColorInput] = useState("#2B7BC4");
  const [submitted, setSubmitted] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);

  // Poll Brand DNA status if submitted
  useQuery({
    queryKey: ["brand-dna-status", userId],
    queryFn: () => fetchBrandDNAStatus(userId),
    enabled: submitted && !brandDNA,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (state?.status === "completed" || state?.status === "failed") {
        return false;
      }
      return 1500;
    },
    select: (data) => {
      if (data.status === "completed" && data.brand_dna) {
        setBrandDNA(data.brand_dna);
      }
      return data;
    },
  });


  const toggleTone = useCallback((tone: string) => {
    setForm((f) => ({
      ...f,
      tone_keywords: f.tone_keywords.includes(tone)
        ? f.tone_keywords.filter((t) => t !== tone)
        : [...f.tone_keywords, tone],
    }));
  }, []);

  const toggleFocus = useCallback((item: string) => {
    setForm((f) => ({
      ...f,
      content_focus: (f.content_focus ?? []).includes(item)
        ? (f.content_focus ?? []).filter((x) => x !== item)
        : [...(f.content_focus ?? []), item],
    }));
  }, []);

  const addColor = () => {
    if (!form.color_palette.includes(colorInput) && form.color_palette.length < 5) {
      setForm((f) => ({ ...f, color_palette: [...f.color_palette, colorInput] }));
    }
  };

  const removeColor = (c: string) => {
    setForm((f) => ({ ...f, color_palette: f.color_palette.filter((x) => x !== c) }));
  };

  const applyPresetPalette = (colors: string[]) => {
    setForm((f) => ({ ...f, color_palette: colors }));
  };

  const handleGenerateGeminiBrand = async () => {
    const company = form.company_name.trim();
    const audience = form.target_audience.trim();
    const desc = (form.business_description ?? "").trim();

    if (!company) {
      setError("Please enter your Company / Brand Name.");
      setActiveTab(1);
      return;
    }
    if (!desc) {
      setError("Please provide a brief Business Description.");
      setActiveTab(1);
      return;
    }
    if (!audience) {
      setError("Please describe your Target Audience in Step 2.");
      setActiveTab(2);
      return;
    }
    if (form.tone_keywords.length === 0) {
      setError("Please select at least one Tone Keyword in Step 3.");
      setActiveTab(3);
      return;
    }

    setError(null);
    setSynthesizing(true);
    try {
      const payload: QuestionnairePayload = {
        ...form,
        company_name: company,
        business_description: desc,
        target_audience: audience,
        instagram_username: form.instagram_username.trim(),
        color_palette: form.color_palette.length > 0 ? form.color_palette : ["#0D2137", "#2B7BC4"],
      };
      await submitQuestionnaire(userId, payload);
      setSubmitted(true);

      // Give 1.5s then poll or fetch brand DNA
      const statusRes = await fetchBrandDNAStatus(userId);
      if (statusRes.brand_dna) {
        setBrandDNA(statusRes.brand_dna);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSynthesizing(false);
    }
  };

  const handleConfirmAndDispatch = async () => {
    setDispatching(true);
    setError(null);
    try {
      const completeRes = await completeOnboarding(userId);
      onComplete(completeRes.assigned_team);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setDispatching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-10 shadow-sm"
    >
      <header className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F4FD] border border-[#C9DFF0] text-[#2B7BC4] text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="size-3.5" />
          <span>Step 4 of 5 • Post-Payment Brand Intake</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0D2137] tracking-tight">
          Brand Discovery & Gemini AI Strategy
        </h2>
        <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
          Enter your brand essentials below. Creo uses Google Gemini AI to formulate your strategic Brand DNA,
          then algorithmically matches and dispatches your dedicated creative pod.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {!submitted || !brandDNA ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* 3-Section Tab Switcher */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#F8FAFC] border border-[#C9DFF0] rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab(1)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 1
                    ? "bg-[#2B7BC4] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#0D2137] hover:bg-white/60"
                }`}
              >
                <Building2 className="size-3.5" />
                <span className="hidden sm:inline">1. Brand Identity</span>
                <span className="sm:hidden">1. Identity</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(2)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 2
                    ? "bg-[#2B7BC4] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#0D2137] hover:bg-white/60"
                }`}
              >
                <Users className="size-3.5" />
                <span className="hidden sm:inline">2. Audience & Goals</span>
                <span className="sm:hidden">2. Audience</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(3)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 3
                    ? "bg-[#2B7BC4] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#0D2137] hover:bg-white/60"
                }`}
              >
                <Palette className="size-3.5" />
                <span className="hidden sm:inline">3. Tone & Strategy</span>
                <span className="sm:hidden">3. Tone</span>
              </button>
            </div>

            {/* TAB 1: Brand Identity & Basics */}
            {activeTab === 1 && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="company-name"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Company / Brand Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="company-name"
                      value={form.company_name}
                      onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                      placeholder="e.g. Apex Studio"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="industry"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Industry Sector
                    </label>
                    <select
                      id="industry"
                      value={form.industry}
                      onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all cursor-pointer"
                    >
                      {INDUSTRY_OPTIONS.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="logo-assets"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Official Logo / Asset Cloud Link
                    </label>
                    <div className="relative">
                      <Globe className="size-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="logo-assets"
                        value={form.official_logo_assets}
                        onChange={(e) => setForm((f) => ({ ...f, official_logo_assets: e.target.value }))}
                        placeholder="Google Drive, Figma, or Dropbox URL"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="website"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Website / Storefront URL
                    </label>
                    <input
                      id="website"
                      value={form.website_url}
                      onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                      placeholder="https://yourbrand.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="desc"
                    className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                  >
                    Business Description & Core Offerings <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="desc"
                    rows={3}
                    value={form.business_description}
                    onChange={(e) => setForm((f) => ({ ...f, business_description: e.target.value }))}
                    placeholder="Describe what your company does, your primary product or service, and what makes your brand stand out..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] transition-all cursor-pointer"
                  >
                    <span>Next: Target Audience & Goals</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Target Audience & Goals */}
            {activeTab === 2 && (
              <div className="space-y-4 pt-2">
                <div>
                  <p className="block text-xs font-bold text-[#0D2137] mb-2 uppercase tracking-wider">
                    Primary Content Goal <span className="text-rose-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GOAL_OPTIONS.map((g) => {
                      const selected = form.primary_goal === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, primary_goal: g }))}
                          className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                            selected
                              ? "bg-[#E8F4FD] border-[#2B7BC4] text-[#2B7BC4] shadow-xs"
                              : "bg-white border-slate-200 text-[#475569] hover:border-[#C9DFF0]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{g}</span>
                            {selected && <Check className="size-3.5 text-[#2B7BC4]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="audience-summary"
                    className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                  >
                    Target Audience Summary <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="audience-summary"
                    value={form.target_audience}
                    onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                    placeholder="e.g. Modern consumers, young professionals and founders aged 22–38"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="age"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Age Range
                    </label>
                    <input
                      id="age"
                      value={form.audience_age_range}
                      onChange={(e) => setForm((f) => ({ ...f, audience_age_range: e.target.value }))}
                      placeholder="e.g. 24–40"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="gender"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Gender Demographic
                    </label>
                    <select
                      id="gender"
                      value={form.audience_gender}
                      onChange={(e) => setForm((f) => ({ ...f, audience_gender: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] cursor-pointer"
                    >
                      <option value="All Genders">All Genders</option>
                      <option value="Female-Identifying">Female-Identifying</option>
                      <option value="Male-Identifying">Male-Identifying</option>
                      <option value="Non-Binary">Non-Binary</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="loc"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Target Location
                    </label>
                    <input
                      id="loc"
                      value={form.audience_location}
                      onChange={(e) => setForm((f) => ({ ...f, audience_location: e.target.value }))}
                      placeholder="e.g. Pan-India / Metros"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="pain-points"
                    className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                  >
                    Customer Pain Points & Core Problem Solved
                  </label>
                  <input
                    id="pain-points"
                    value={form.audience_problems_solved}
                    onChange={(e) => setForm((f) => ({ ...f, audience_problems_solved: e.target.value }))}
                    placeholder="e.g. Difficulty finding reliable creative agencies with predictable delivery schedules"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ig"
                    className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                  >
                    Instagram Handle
                  </label>
                  <div className="relative">
                    <Instagram className="size-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="ig"
                      value={form.instagram_username}
                      onChange={(e) => setForm((f) => ({ ...f, instagram_username: e.target.value }))}
                      placeholder="@yourbrand"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="px-4 py-2.5 rounded-xl border border-[#C9DFF0] text-xs font-bold text-[#64748B] hover:text-[#0D2137] transition-all cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(3)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] transition-all cursor-pointer"
                  >
                    <span>Next: Tone & Visual Style</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Tone, Style & Strategy */}
            {activeTab === 3 && (
              <div className="space-y-5 pt-2">
                {/* Tone Keywords */}
                <div>
                  <p className="block text-xs font-bold text-[#0D2137] mb-2 uppercase tracking-wider">
                    Brand Tone Keywords (Select all that fit) <span className="text-rose-500">*</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map((tone) => {
                      const active = form.tone_keywords.includes(tone);
                      return (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => toggleTone(tone)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? "bg-[#2B7BC4] text-white shadow-xs border border-[#2B7BC4]"
                              : "bg-slate-50 text-[#64748B] border border-[#C9DFF0] hover:bg-white hover:text-[#0D2137]"
                          }`}
                        >
                          {tone}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Palette */}
                <div>
                  <p className="block text-xs font-bold text-[#0D2137] mb-2 uppercase tracking-wider">
                    Brand Color Palette (Up to 5 Colors)
                  </p>

                  {/* Preset palettes */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-[#64748B] self-center">Presets:</span>
                    {PRESET_PALETTES.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPresetPalette(preset.colors)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#C9DFF0] bg-white text-[11px] font-semibold text-[#0D2137] hover:bg-[#F0F7FD] transition-colors cursor-pointer"
                      >
                        <div className="flex -space-x-1">
                          {preset.colors.map((c) => (
                            <span
                              key={c}
                              className="size-3 rounded-full border border-white"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 items-center flex-wrap">
                    {form.color_palette.map((c) => (
                      <ColorSwatch key={c} color={c} onRemove={() => removeColor(c)} />
                    ))}
                    {form.color_palette.length < 5 && (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorInput}
                          onChange={(e) => setColorInput(e.target.value)}
                          className="size-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          aria-label="Pick custom colour"
                        />
                        <button
                          type="button"
                          onClick={addColor}
                          className="px-3 py-1 bg-white border border-[#C9DFF0] rounded-lg text-xs font-semibold text-[#0D2137] hover:bg-[#F0F7FD] transition-colors cursor-pointer"
                        >
                          + Add Color
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Focus Formats */}
                <div>
                  <p className="block text-xs font-bold text-[#0D2137] mb-2 uppercase tracking-wider">
                    Deliverable Format Focus
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_FOCUS_OPTIONS.map((opt) => {
                      const active = (form.content_focus ?? []).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleFocus(opt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                            active
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:border-[#C9DFF0]"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Style references & Topics to avoid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="style-refs"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Style References / Inspo Links
                    </label>
                    <input
                      id="style-refs"
                      value={(form.style_references ?? []).join(", ")}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          style_references: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="@apple, minimalist editorial, motion posters"
                      className="w-full px-3 py-2 rounded-xl border border-[#C9DFF0] bg-white text-xs text-[#0D2137]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="avoid"
                      className="block text-xs font-bold text-[#0D2137] mb-1.5 uppercase tracking-wider"
                    >
                      Topics or Angles to Avoid
                    </label>
                    <input
                      id="avoid"
                      value={form.topics_to_avoid}
                      onChange={(e) => setForm((f) => ({ ...f, topics_to_avoid: e.target.value }))}
                      placeholder="e.g. Overly corporate jargon, clip-art"
                      className="w-full px-3 py-2 rounded-xl border border-[#C9DFF0] bg-white text-xs text-[#0D2137]"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="px-4 py-2.5 rounded-xl border border-[#C9DFF0] text-xs font-bold text-[#64748B] hover:text-[#0D2137] transition-all cursor-pointer"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
                <ShieldAlert className="size-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Synthesize Button */}
            <div className="pt-3">
              <button
                id="submit-questionnaire-btn"
                type="button"
                onClick={handleGenerateGeminiBrand}
                disabled={synthesizing}
                className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1A5EA8] text-white font-bold text-sm sm:text-base hover:brightness-105 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {synthesizing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Synthesizing Brand Strategy via Gemini AI Engine…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 text-amber-300" />
                    <span>Generate Brand Strategy with Gemini AI →</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-[#64748B] text-center mt-2">
                Gemini 1.5 Flash evaluates your brand persona, content pillars, and tone guidelines.
              </p>
            </div>
          </motion.div>
        ) : (
          /* Brand DNA Generated View */
          <motion.div key="generated" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BrandDNACard
              dna={brandDNA}
              onEdit={() => {
                setSubmitted(false);
                setBrandDNA(null);
              }}
              onConfirmDispatch={handleConfirmAndDispatch}
              isDispatching={dispatching}
            />

            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                ⚠ {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default StageQuestionnaire;
