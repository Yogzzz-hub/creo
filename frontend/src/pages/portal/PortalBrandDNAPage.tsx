import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { useSearchParams } from "react-router";
import { request } from "../../lib/http";
import {
  Sparkles,
  Palette,
  Target,
  Shield,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  Film,
  Image as ImageIcon,
  Copy,
  Check,
  Upload,
  History,
  Edit3,
  X,
  FileText,
  Type,
} from "lucide-react";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

/* ── Fallback Brand Palette ── */
const DEFAULT_PALETTE = ["#161F2D", "#7FA0D6", "#3E5A74", "#BCCCE6"];

function sanitizeColor(val: unknown, fallback: string): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (trimmed.startsWith("#") && (trimmed.length === 4 || trimmed.length === 7 || trimmed.length === 9)) {
    return trimmed;
  }
  if (trimmed.startsWith("rgb")) return trimmed;
  return fallback;
}

const VOICE_OPTIONS = [
  "Warm",
  "Playful",
  "Premium",
  "Craft-first",
  "Bold",
  "Minimal",
  "Local",
  "Witty",
  "Friendly",
  "Technical",
  "Authoritative",
  "Direct",
];

export function PortalBrandDNAPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "brand";

  const { data: profile } = useQuery<any>({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request("/api/v1/portal/profile"),
  });

  const gate = useOnboardingGate();
  const isBrandTab = tab === "brand" || tab === "edit-brand";

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(tab === "edit-brand");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalText, setSuccessModalText] = useState("Changes saved successfully!");

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      setIsEditModalOpen(false);
      setSuccessModalText("Changes saved successfully!");
      setIsSuccessModalOpen(true);
      if (searchParams.has("tab")) {
        setSearchParams({ tab: "brand" });
      }
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to update Brand DNA.");
    },
  });

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    brandName: "",
    igHandle: "",
    whatYouSell: "",
    voiceWords: [] as string[],
    audience: "",
    painPoints: "",
    competitors: "",
    colors: [...DEFAULT_PALETTE],
  });

  useEffect(() => {
    if (profile) {
      const dna = profile.brand_dna || {};
      const rawPalette: any[] = Array.isArray(dna.palette) && dna.palette.length > 0
        ? dna.palette
        : Array.isArray(dna.visual_direction?.primary_colors) && dna.visual_direction.primary_colors.length > 0
        ? dna.visual_direction.primary_colors
        : DEFAULT_PALETTE;

      const cleanColors = [0, 1, 2, 3].map((i) =>
        sanitizeColor(rawPalette[i], DEFAULT_PALETTE[i] || "#161F2D")
      );

      const words = Array.isArray(dna.tone?.voice_words) && dna.tone.voice_words.length > 0
        ? dna.tone.voice_words
        : Array.isArray(dna.tone_keywords) && dna.tone_keywords.length > 0
        ? dna.tone_keywords
        : ["Warm", "Premium", "Friendly"];

      const aud = dna.audience_segments?.[0]?.description || dna.target_audience || "";
      const pain = dna.audience_segments?.[0]?.core_pain_point || dna.value_propositions || "";

      setForm({
        name: profile.full_name || user?.full_name || "",
        company: profile.company_name || user?.company_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        brandName: profile.company_name || "",
        igHandle: profile.instagram_username || "",
        whatYouSell: dna.summary_line || profile.brand_summary || "",
        audience: aud,
        painPoints: pain,
        competitors: "",
        voiceWords: words,
        colors: cleanColors,
      });
    }
  }, [profile, user]);

  const handleCopyHex = (hex: string, index: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveBrandDNA = () => {
    updateProfileMutation.mutate({
      company_name: form.brandName,
      instagram_username: form.igHandle,
      brand_summary: form.whatYouSell,
      brand_dna: {
        ...(profile?.brand_dna || {}),
        summary_line: form.whatYouSell,
        target_audience: form.audience,
        tone_keywords: form.voiceWords,
        palette: form.colors,
        audience_segments: [
          {
            name: "Primary Adopters",
            description: form.audience,
            core_pain_point: form.painPoints,
          },
        ],
      },
    });
  };

  const toggleVoiceWord = (word: string) => {
    setForm((prev) => ({
      ...prev,
      voiceWords: prev.voiceWords.includes(word)
        ? prev.voiceWords.filter((w) => w !== word)
        : [...prev.voiceWords, word],
    }));
  };

  const updateColor = (idx: number, hex: string) => {
    const newColors = [...form.colors];
    newColors[idx] = hex;
    setForm((prev) => ({ ...prev, colors: newColors }));
  };

  if (!gate.isComplete && isBrandTab) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-10">
        <SubscriptionLockedState
          title="Brand DNA Locked"
          description="Complete your onboarding setup to manage your brand DNA, visual assets, and brand guidelines."
        />
      </div>
    );
  }

  const dna = profile?.brand_dna || {};
  const tone = dna.tone || {};
  const toneVoiceWords: string[] = form.voiceWords.length > 0
    ? form.voiceWords
    : Array.isArray(tone.voice_words)
    ? tone.voice_words
    : ["Warm", "Premium", "Friendly"];

  const toneMetrics = [
    { label: "Formality", value: typeof tone.formality === "number" ? tone.formality : 4, max: 10 },
    { label: "Energy", value: typeof tone.energy === "number" ? tone.energy : 7, max: 10 },
    { label: "Humour", value: typeof tone.humour === "number" ? tone.humour : 4, max: 10 },
    { label: "Respectfulness", value: typeof tone.respectfulness === "number" ? tone.respectfulness : 8, max: 10 },
  ];

  const colorRoles = ["Primary Brand", "Accent / Secondary", "Surface / Canvas", "Glow / Highlight"];

  const pillars = Array.isArray(dna.content_pillars) && dna.content_pillars.length > 0
    ? dna.content_pillars
    : [
        {
          name: "Value & Proof Breakdown",
          rationale: "Addresses customer skepticism and showcases tangible value, craft quality, and clear benefits.",
          funnel_stage: "conversion",
          best_formats: ["reel", "carousel"],
          example_angles: [
            "Behind the product: Transparent value breakdown",
            "How our standards outperform conventional alternatives",
            "Customer spotlight and real-world durability test",
          ],
        },
        {
          name: "The Behind-The-Craft Series",
          rationale: "Establishes authentic practitioner authority and highlights attention to detail.",
          funnel_stage: "authority",
          best_formats: ["reel", "story"],
          example_angles: [
            "Behind the scenes: How we craft every single batch",
            "3 corners other brands cut that we strictly avoid",
            "Meet the creative specialists driving our work",
          ],
        },
        {
          name: "Category Insights & Daily Tips",
          rationale: "Drives top-of-funnel organic discovery by solving everyday audience pain points.",
          funnel_stage: "reach",
          best_formats: ["poster", "carousel", "reel"],
          example_angles: [
            "3 common mistakes customers make in our space",
            "The 30-second daily fix to level up your routine",
            "Why conventional advice in this industry is broken",
          ],
        },
      ];

  const doList = Array.isArray(tone.writing_rules) && tone.writing_rules.length > 0
    ? tone.writing_rules
    : [
        "Always lead with the customer benefit before explaining technical details",
        "Keep sentence structure punchy, direct, and under 18 words",
        "Maintain consistent brand palette contrast and premium typography",
        "End every caption with a single, clear, unambiguous action prompt",
      ];

  const dontList = Array.isArray(dna.do_not) && dna.do_not.length > 0
    ? dna.do_not
    : Array.isArray(dna.guidelines?.donts) && dna.guidelines.donts.length > 0
    ? dna.guidelines.donts
    : [
        "Never sound overly corporate, robotic, or salesy",
        "Avoid generic stock imagery without custom color grading",
        "Never make unverified claims or false turnaround promises",
        "Avoid cluttered typography overlays and off-palette colors",
      ];

  const hooks = Array.isArray(dna.hooks) && dna.hooks.length > 0
    ? dna.hooks
    : Array.isArray(dna.cta_bank) && dna.cta_bank.length > 0
    ? dna.cta_bank
    : [
        "Stop making this 1 crucial mistake when choosing your brand essentials.",
        "The transparent breakdown of what actually goes into every single batch.",
        "Why our customers never switch back once they experience the difference.",
      ];

  const formatIcon = (fmt: string) => {
    switch (fmt.toLowerCase()) {
      case "reel":
        return <Film className="size-3.5 text-[#7FA0D6]" />;
      case "poster":
        return <ImageIcon className="size-3.5 text-[#BCCCE6]" />;
      case "carousel":
        return <Layers className="size-3.5 text-[#7FA0D6]" />;
      default:
        return <Sparkles className="size-3.5 text-[#D8BF9B]" />;
    }
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6 pb-12 relative">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUCCESS POPUP (CENTERED WITH WHOLE BG BLURRED)              */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className="absolute top-4 right-4 size-7 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="size-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Changes Saved Successfully</h3>
              <p className="text-xs text-[#97A0B3] leading-relaxed">
                {successModalText}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold text-xs hover:bg-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUGGEST AN EDIT POPUP (CENTERED WITH WHOLE BG BLURRED)      */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                  <Edit3 className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Suggest an Edit to Brand DNA</h3>
                  <p className="text-xs text-[#97A0B3]">Changes update your brand's production brief instantly.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="size-7 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={form.brandName}
                    onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                    className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7FA0D6]"
                    placeholder="e.g. Creo Studios"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={form.igHandle}
                    onChange={(e) => setForm({ ...form, igHandle: e.target.value })}
                    className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7FA0D6]"
                    placeholder="e.g. @creo_studios"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">
                  What do you sell, in one line?
                </label>
                <input
                  type="text"
                  value={form.whatYouSell}
                  onChange={(e) => setForm({ ...form, whatYouSell: e.target.value })}
                  className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#7FA0D6]"
                  placeholder="e.g. Artisan coffee roastery and specialty café."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">
                  Tone & Voice Keywords
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VOICE_OPTIONS.map((word) => {
                    const active = form.voiceWords.some((w) => w.toLowerCase() === word.toLowerCase());
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => toggleVoiceWord(word)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-[#7FA0D6] text-white shadow-xs"
                            : "bg-[#0B111C] border border-[#2A3446] text-[#97A0B3] hover:text-white"
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">
                    Target Audience
                  </label>
                  <textarea
                    rows={2}
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3.5 py-2 text-xs text-white resize-none focus:outline-none focus:border-[#7FA0D6]"
                    placeholder="e.g. Urban coffee enthusiasts aged 22-45."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">
                    Core Pain Points
                  </label>
                  <textarea
                    rows={2}
                    value={form.painPoints}
                    onChange={(e) => setForm({ ...form, painPoints: e.target.value })}
                    className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3.5 py-2 text-xs text-white resize-none focus:outline-none focus:border-[#7FA0D6]"
                    placeholder="e.g. Looking for authentic roast quality and fast morning service."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5">
                  Brand Color Palette
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {form.colors.map((color, idx) => (
                    <div key={idx} className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-2.5 space-y-1.5">
                      <div className="relative w-full h-10 rounded-lg border border-[#2A3446] overflow-hidden flex items-center justify-center">
                        <input
                          type="color"
                          value={color.startsWith("#") ? color : "#161F2D"}
                          onChange={(e) => updateColor(idx, e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                        <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: color }} />
                        <Palette className="size-3.5 text-white/40 drop-shadow z-0" />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#97A0B3]">Color {idx + 1}</span>
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => updateColor(idx, e.target.value)}
                          className="w-16 font-mono text-[10px] text-white bg-transparent border-b border-[#2A3446] text-right focus:outline-none focus:border-[#7FA0D6]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-[#2A3446] flex items-center justify-between">
              <span className="text-[11px] text-[#97A0B3]">Changes sync immediately</span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white hover:bg-[#161F2D] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBrandDNA}
                  disabled={updateProfileMutation.isPending}
                  className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Brand DNA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* VERSION HISTORY MODAL (CENTERED WITH WHOLE BG BLURRED)      */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
              <div className="flex items-center gap-2">
                <History className="size-4 text-[#7FA0D6]" />
                <h3 className="text-base font-bold text-white">Brand DNA Version History</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="size-7 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  version: "Version 3",
                  date: "2 Sep 2026 · 14:32 UTC",
                  author: "You (Client)",
                  status: "Active Current",
                  notes: "Updated brand one-liner, color palette hex codes, and verified voice keywords.",
                  active: true,
                },
                {
                  version: "Version 2",
                  date: "28 Aug 2026 · 10:15 UTC",
                  author: "Elena Rostova (Account Director)",
                  status: "Pod Synced",
                  notes: "Refined 3 content pillars, funnel alignment, and tone metric gauges.",
                  active: false,
                },
                {
                  version: "Version 1",
                  date: "15 Aug 2026 · 09:00 UTC",
                  author: "Creo AI Engine",
                  status: "Initial Synthesis",
                  notes: "Synthesized automatically from onboarding questionnaire intake.",
                  active: false,
                },
              ].map((v, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border transition-colors ${
                    v.active ? "bg-[#0B111C] border-[#7FA0D6]/40" : "bg-[#0B111C]/50 border-[#2A3446]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{v.version}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.05] text-[#97A0B3]"
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7FA0D6] mb-1.5">{v.date} · {v.author}</p>
                  <p className="text-xs text-[#97A0B3] leading-relaxed">{v.notes}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#2A3446] flex justify-end">
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A3446]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
              <span className="size-1.5 rounded-full bg-[#7FA0D6] animate-pulse" />
              VERSION 3 · SYNCED WITH CREATIVE POD
            </span>
            <span className="text-xs text-[#97A0B3]">Updated on 2 Sep</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Brand DNA</h1>
          <p className="text-xs sm:text-sm text-[#97A0B3] mt-0.5">
            The strategic compass, visual system, and creative guidelines governing all content for your brand.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsVersionModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#2A3446] bg-[#0B111C] text-xs sm:text-[13px] font-medium text-white hover:bg-[#161F2D] hover:border-[#7FA0D6]/40 transition-colors cursor-pointer"
          >
            <History className="size-3.5 text-[#97A0B3]" /> Version history
          </button>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs sm:text-[13px] font-bold hover:bg-white transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Edit3 className="size-3.5" /> Suggest an edit
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── CARD 1: BRAND VOICE & PERSONALITY ── */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A3446] bg-[#0B111C]/50">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                <Sparkles className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Brand Voice & Personality</h3>
            </div>
            <span className="text-[11px] font-medium text-[#7FA0D6]">Verified Guidelines</span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Summary Line Quote Box */}
            <div className="p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                Core Brand Pitch / One-Liner
              </span>
              <p className="text-sm font-medium text-white leading-relaxed">
                "{profile?.brand_dna?.summary_line || form.whatYouSell || "Strategic, engaging, and aligned with your target audience brand guidelines."}"
              </p>
            </div>

            {/* Voice Words */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-2.5">
                Key Voice Attributes
              </span>
              <div className="flex flex-wrap gap-2">
                {toneVoiceWords.map((word: string) => (
                  <span
                    key={word}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-[#7FA0D6]/15 text-[#BCCCE6] border border-[#7FA0D6]/30 shadow-xs"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Tone Sliders / Metrics */}
            <div className="pt-4 border-t border-[#2A3446]/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-3">
                Tone Dimensions & Gauges
              </span>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {toneMetrics.map((metric) => (
                  <div key={metric.label} className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-white font-medium">{metric.label}</span>
                      <span className="font-mono text-[#7FA0D6] font-bold">{metric.value}/{metric.max}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#161F2D] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7FA0D6] to-[#BCCCE6]"
                        style={{ width: `${(metric.value / metric.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: BRAND COLOR PALETTE & TYPOGRAPHY ── */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A3446] bg-[#0B111C]/50">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                <Palette className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Visual Palette & Tokens</h3>
            </div>
            <span className="text-[11px] font-medium text-[#97A0B3]">Click swatch to copy hex</span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Color Swatches Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {form.colors.map((hex, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopyHex(hex, idx)}
                  className="group relative bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/50 rounded-xl p-2.5 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                  title="Click to copy hex"
                >
                  <div
                    className="w-full aspect-[4/3] rounded-lg mb-2.5 border border-[#2A3446] shadow-inner relative flex items-center justify-center"
                    style={{ backgroundColor: hex }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-md px-2 py-1 flex items-center gap-1 text-[10px] text-white font-medium">
                      {copiedIndex === idx ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-white truncate">{colorRoles[idx]}</p>
                  <p className="font-mono text-[10px] text-[#97A0B3] uppercase tracking-wider mt-0.5">{hex}</p>
                </div>
              ))}
            </div>

            {/* Typography Pairing */}
            <div className="pt-4 border-t border-[#2A3446]/80 space-y-3">
              <div className="flex items-center gap-2">
                <Type className="size-3.5 text-[#7FA0D6]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]">
                  Typography Pairing & System
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                    Headlines / Display
                  </span>
                  <p className="text-base font-bold text-white tracking-tight">
                    {dna.typography?.headline || "Inter Display · 700 Bold"}
                  </p>
                  <p className="text-xs text-[#97A0B3] mt-1 font-sans">
                    Bold, punchy titles optimized for feed stops.
                  </p>
                </div>
                <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                    Body Copy / Subtitles
                  </span>
                  <p className="text-base font-normal text-white">
                    {dna.typography?.body || "Inter Sans · 400 Regular"}
                  </p>
                  <p className="text-xs text-[#97A0B3] mt-1 font-sans">
                    High legibility for reel captions and poster details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: TARGET AUDIENCE & POSITIONING ── */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A3446] bg-[#0B111C]/50">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                <Target className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Audience & Positioning</h3>
            </div>
            <span className="text-[11px] font-medium text-[#7FA0D6]">Core Demographics</span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                  Primary Target Demographic
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FA0D6]/15 text-[#BCCCE6]">
                  Primary Adopters
                </span>
              </div>
              <p className="text-sm font-medium text-white leading-relaxed">
                {form.audience || dna.audience_segments?.[0]?.description || "Urban professionals, remote creatives, and high-standard coffee aficionados."}
              </p>
            </div>

            <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1.5">
                Core Pain Points & Care-Abouts
              </span>
              <p className="text-sm font-medium text-white leading-relaxed">
                {form.painPoints || dna.audience_segments?.[0]?.core_pain_point || "Seeking reliable artisan quality, fast morning turnaround, and a warm community space."}
              </p>
            </div>

            {dna.positioning && (
              <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1.5">
                  Strategic Positioning
                </span>
                <p className="text-xs text-[#97A0B3] leading-relaxed">
                  {dna.positioning}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── CARD 4: DO'S & DON'TS (CREATIVE GUARDRAILS) ── */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A3446] bg-[#0B111C]/50">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                <Shield className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Creative Do's & Don'ts</h3>
            </div>
            <span className="text-[11px] font-medium text-[#97A0B3]">Pod Production Rules</span>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Do Column */}
            <div className="bg-[#0B111C] border border-emerald-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Approved (Do)</h4>
              </div>
              <ul className="space-y-2.5">
                {doList.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/90 leading-snug">
                    <span className="size-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Don't Column */}
            <div className="bg-[#0B111C] border border-rose-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-rose-500/20">
                <AlertCircle className="size-4 text-rose-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Strictly Avoid (Don't)</h4>
              </div>
              <ul className="space-y-2.5">
                {dontList.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/90 leading-snug">
                    <span className="size-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── CARD 5: CONTENT PILLARS & FORMATS ── */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A3446] bg-[#0B111C]/50">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                <Layers className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Content Pillars & Strategy</h3>
            </div>
            <span className="text-[11px] font-medium text-[#7FA0D6]">3 Synthesized Pillars</span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {pillars.map((pillar: any, idx: number) => (
              <div key={idx} className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">{pillar.name}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      pillar.funnel_stage === "conversion"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : pillar.funnel_stage === "authority"
                        ? "bg-[#7FA0D6]/15 text-[#BCCCE6] border border-[#7FA0D6]/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {pillar.funnel_stage}
                  </span>
                </div>
                <p className="text-xs text-[#97A0B3] leading-relaxed">{pillar.rationale}</p>

                {Array.isArray(pillar.best_formats) && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold uppercase text-[#97A0B3]">Best Formats:</span>
                    <div className="flex items-center gap-1.5">
                      {pillar.best_formats.map((fmt: string) => (
                        <span
                          key={fmt}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446] text-[11px] text-white capitalize font-medium"
                        >
                          {formatIcon(fmt)}
                          <span>{fmt}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CARD 6: HIGH-PERFORMING HOOKS & ASSETS ── */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A3446] bg-[#0B111C]/50">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                <Zap className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Campaign Hooks & Brand Files</h3>
            </div>
            <span className="text-[11px] font-medium text-[#BCCCE6]">Sprint Bank</span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Hooks */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-2.5">
                High-CTR Campaign Hook Angles
              </span>
              <div className="space-y-2">
                {hooks.map((hook: string, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between gap-3 text-xs text-white"
                  >
                    <span className="italic">"{hook}"</span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FA0D6]/15 text-[#7FA0D6]">
                      Approved Hook
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand Files */}
            <div className="pt-4 border-t border-[#2A3446]/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-2.5">
                Brand Files & Assets
              </span>
              <div className="p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-[#161F2D] border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Brand Assets & Logo Packs</h5>
                    <p className="text-[11px] text-[#97A0B3]">Vector marks, font licenses, and product photography</p>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#2A3446] bg-[#161F2D] text-xs font-medium text-white hover:border-[#7FA0D6]/40 transition-colors cursor-pointer">
                  <Upload className="size-3.5" /> Upload assets
                  <input
                    type="file"
                    className="hidden"
                    onChange={() => {
                      setIsSuccessModalOpen(true);
                      setSuccessModalText("Assets uploaded and queued for creative pod review!");
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
