import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { Sparkles, ArrowRight, RefreshCw, X } from "lucide-react";
import { fetchBrandDNAStatus, submitQuestionnaire } from "../../lib/onboarding-api";
import type { BrandDNA, QuestionnairePayload } from "../../types/api";

interface StageQuestionnaireProps {
  userId: string;
  onComplete: () => void;
}

const TONE_OPTIONS = [
  "Bold",
  "Playful",
  "Minimal",
  "Luxury",
  "Raw",
  "Warm",
  "Authoritative",
  "Quirky",
];

const GOAL_OPTIONS = [
  "Brand Awareness",
  "Lead Generation",
  "Product Launch",
  "Community Building",
  "Engagement",
];

function ColorSwatch({ color, onRemove }: { color: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-2 bg-slate-50 border border-[#C9DFF0] rounded-lg px-2.5 py-1 text-xs">
      <div
        className="size-4 rounded-full border border-black/10 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-[11px] font-semibold text-[#0D2137]">{color}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[#64748B] hover:text-rose-600 transition-colors p-0.5"
        aria-label={`Remove ${color}`}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function BrandDNACard({ dna }: { dna: BrandDNA }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#C9DFF0] bg-gradient-to-br from-[#F8FAFC] to-[#E8F4FD] p-6 mt-6 shadow-xs text-left"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-5 text-[#2B7BC4]" />
        <h3 className="font-display font-bold text-lg text-[#0D2137]">
          Synthesized Brand DNA
        </h3>
      </div>

      <p className="text-sm text-[#374151] leading-relaxed mb-4">
        {dna.ai_summary_line ?? dna.summary}
      </p>

      <div className="space-y-3 text-xs">
        <div>
          <span className="font-bold uppercase tracking-wider text-[#64748B] text-[10px]">
            Tone of Voice
          </span>
          <p className="text-sm font-semibold text-[#0D2137] mt-0.5">{dna.tone}</p>
        </div>

        <div>
          <span className="font-bold uppercase tracking-wider text-[#64748B] text-[10px]">
            Target Audience
          </span>
          <p className="text-sm font-semibold text-[#0D2137] mt-0.5">{dna.target_audience}</p>
        </div>

        <div>
          <span className="font-bold uppercase tracking-wider text-[#64748B] text-[10px]">
            Brand Color Palette
          </span>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {dna.palette.map((c) => (
              <div
                key={c}
                title={c}
                className="size-7 rounded-lg border border-black/10 shadow-2xs"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="font-bold uppercase tracking-wider text-[#64748B] text-[10px]">
            Recommended Creative Formats
          </span>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {dna.recommended_formats.map((f) => (
              <span
                key={f}
                className="px-2.5 py-0.5 rounded-full bg-[#E8F4FD] text-[#2B7BC4] border border-[#C9DFF0] font-semibold text-[11px]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function StageQuestionnaire({ userId, onComplete }: StageQuestionnaireProps) {
  const [form, setForm] = useState<QuestionnairePayload>({
    company_name: "",
    instagram_username: "",
    target_audience: "",
    tone_keywords: [],
    color_palette: ["#2B7BC4", "#065F46"],
    content_goals: [],
  });
  const [colorInput, setColorInput] = useState("#2B7BC4");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandDNA, setBrandDNA] = useState<BrandDNA | null>(null);

  const { data: dnaStatus } = useQuery({
    queryKey: ["brand-dna-status", userId],
    queryFn: () => fetchBrandDNAStatus(userId),
    enabled: submitted,
    refetchInterval: (data) => {
      if (data?.state?.data?.status === "completed" || data?.state?.data?.status === "failed")
        return false;
      return 2000;
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

  const toggleGoal = useCallback((goal: string) => {
    setForm((f) => ({
      ...f,
      content_goals: f.content_goals.includes(goal)
        ? f.content_goals.filter((g) => g !== goal)
        : [...f.content_goals, goal],
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

  const handleSubmit = async () => {
    const company = form.company_name.trim();
    const audience = form.target_audience.trim();
    if (!company) {
      setError("Please enter your company or brand name.");
      return;
    }
    if (!audience) {
      setError("Please describe your target audience.");
      return;
    }
    if (form.tone_keywords.length === 0) {
      setError("Please select at least one tone keyword.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: QuestionnairePayload = {
        ...form,
        company_name: company,
        instagram_username: form.instagram_username.trim(),
        target_audience: audience,
        color_palette: form.color_palette.length > 0 ? form.color_palette : ["#2B7BC4", "#065F46"],
      };
      await submitQuestionnaire(userId, payload);
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-8 shadow-sm"
    >
      <header className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F4FD] border border-[#C9DFF0] text-[#2B7BC4] text-xs font-semibold uppercase tracking-wider mb-3">
          Step 4 of 5
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0D2137] tracking-tight">
          Brand Discovery & DNA
        </h2>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 leading-relaxed">
          Tell us about your brand. Creo AI will synthesize an actionable Brand DNA to guide all your
          social reels, carousels, and creative assets.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="company-name" className="block text-xs font-semibold text-[#0D2137] mb-1.5 uppercase tracking-wider">
                Company / Brand Name
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
              <label htmlFor="instagram" className="block text-xs font-semibold text-[#0D2137] mb-1.5 uppercase tracking-wider">
                Instagram Handle
              </label>
              <input
                id="instagram"
                value={form.instagram_username}
                onChange={(e) => setForm((f) => ({ ...f, instagram_username: e.target.value }))}
                placeholder="@yourbrand"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="audience" className="block text-xs font-semibold text-[#0D2137] mb-1.5 uppercase tracking-wider">
                Target Audience
              </label>
              <input
                id="audience"
                value={form.target_audience}
                onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                placeholder="e.g. Young professionals and founders aged 22–38"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9DFF0] bg-white text-sm text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 transition-all"
              />
            </div>

            {/* Tone Keywords */}
            <div>
              <p className="block text-xs font-semibold text-[#0D2137] mb-2 uppercase tracking-wider">
                Tone Keywords (Select all that apply)
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
              <p className="block text-xs font-semibold text-[#0D2137] mb-2 uppercase tracking-wider">
                Brand Palette (Up to 5 hex colors)
              </p>
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
                      className="size-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      aria-label="Pick colour"
                    />
                    <button
                      type="button"
                      onClick={addColor}
                      className="px-3 py-1 bg-white border border-[#C9DFF0] rounded-lg text-xs font-semibold text-[#0D2137] hover:bg-[#F0F7FD] transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content Goals */}
            <div>
              <p className="block text-xs font-semibold text-[#0D2137] mb-2 uppercase tracking-wider">
                Primary Content Goals
              </p>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((goal) => {
                  const active = form.content_goals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-emerald-600 text-white shadow-xs border border-emerald-600"
                          : "bg-slate-50 text-[#64748B] border border-[#C9DFF0] hover:bg-white hover:text-[#0D2137]"
                      }`}
                    >
                      {goal}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
                ⚠ {error}
              </div>
            )}

            <button
              id="submit-questionnaire-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#2B7BC4] text-white font-semibold text-sm hover:bg-[#1A5EA8] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting && <RefreshCw className="size-4 animate-spin" />}
              <span>{submitting ? "Synthesizing Brand DNA…" : "Submit & Generate Brand DNA →"}</span>
            </button>
          </motion.div>
        ) : (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!brandDNA ? (
              <div className="text-center py-8">
                <div className="size-12 rounded-2xl bg-[#E8F4FD] border border-[#C9DFF0] flex items-center justify-center text-[#2B7BC4] mx-auto mb-3 animate-pulse">
                  <Sparkles className="size-6 text-[#2B7BC4]" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#0D2137] mb-1">
                  Synthesizing Your Brand DNA
                </h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Our AI engine is compiling your audience, tone, and strategic visual rules...
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-[#64748B] text-xs font-mono">
                  <RefreshCw className="size-3 animate-spin" />
                  <span>Status: {dnaStatus?.status ?? "processing"}</span>
                </div>
              </div>
            ) : (
              <div>
                <BrandDNACard dna={brandDNA} />
                <button
                  id="brand-dna-next-btn"
                  type="button"
                  onClick={onComplete}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#2B7BC4] text-white font-semibold text-sm hover:bg-[#1A5EA8] shadow-sm transition-all cursor-pointer"
                >
                  <span>Complete Onboarding & View Creative Pod</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default StageQuestionnaire;
