import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Edit3,
  X,
  FileText,
  Type,
  Trash2,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { resolveAssetUrl } from "../../lib/media";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

/* ── Fallback Brand Palette ── */
const DEFAULT_PALETTE = ["#0F0E0C", "#D2965A", "#172338", "#F5EEE3"];

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
  const { user, patchUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "brand";

  const { data: profile } = useQuery<any>({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request("/api/v1/portal/profile"),
  });

  const { data: logoData } = useQuery({
    queryKey: ["brand-logo-asset"],
    queryFn: async () => {
      try {
        return await request<{ brand_logo_url: string | null }>("/api/v1/onboarding/questionnaire/logo");
      } catch {
        return { brand_logo_url: null };
      }
    },
  });

  const gate = useOnboardingGate();
  const isBrandTab = tab === "brand" || tab === "edit-brand";

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(tab === "edit-brand");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalText, setSuccessModalText] = useState("Changes saved successfully!");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    voice: true,
    audience: false,
    pillars: false,
    palette: false,
    dodont: false,
    hooks: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    const isAnyModalOpen = isSuccessModalOpen || isEditModalOpen;
    if (!isAnyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSuccessModalOpen(false);
        setIsEditModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSuccessModalOpen, isEditModalOpen]);

  const brandFiles: any[] = profile?.brand_dna?.files || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const formData = new FormData();
        formData.append("file", file);
        await request("/api/v1/portal/brand/upload", {
          method: "POST",
          body: formData,
        });
        successCount++;
      }
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      const firstFileName = files[0]?.name || "Asset";
      setSuccessModalText(
        successCount === 1
          ? `"${firstFileName}" uploaded and saved to your brand assets!`
          : `${successCount} brand assets uploaded and saved successfully!`
      );
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      alert(err?.message || "Failed to upload asset. Please try again.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await request(`/api/v1/portal/brand/files/${fileId}`, {
        method: "DELETE",
      });
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
    } catch (err: any) {
      alert(err?.message || "Failed to delete file. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      if (variables?.company_name) {
        patchUser({ company_name: variables.company_name });
      }
      queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
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
        sanitizeColor(rawPalette[i], DEFAULT_PALETTE[i] || "#0F0E0C")
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
      <div className="w-full">
        <SubscriptionLockedState
          title="Brand DNA Locked"
          description="Complete setup to manage your brand assets and guidelines."
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
        return <Film className="size-3.5 text-app-accent" />;
      case "poster":
        return <ImageIcon className="size-3.5 text-app-accent-soft" />;
      case "carousel":
        return <Layers className="size-3.5 text-app-accent" />;
      default:
        return <Sparkles className="size-3.5 text-app-warm" />;
    }
  };

  return (
    <div className="w-full min-w-0 animate-in fade-in duration-300 space-y-4 relative">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUCCESS POPUP (CENTERED VIA PORTAL WITH BODY SCROLL LOCKED) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isSuccessModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setIsSuccessModalOpen(false)}
          >
            <div
              className="bg-app-surface border border-app-line rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 m-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="absolute top-4 right-4 size-7 rounded-lg border border-app-line bg-app-base flex items-center justify-center text-app-mist hover:text-hi transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="size-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-hi tracking-tight">Changes Saved Successfully</h3>
                <p className="text-xs text-app-mist leading-relaxed">
                  {successModalText}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-2.5 rounded-full bg-app-accent-soft text-app-base font-bold text-xs hover:bg-hi transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUGGEST AN EDIT POPUP (CENTERED VIA PORTAL)                 */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isEditModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
            onClick={() => setIsEditModalOpen(false)}
          >
            <div
              className="bg-app-surface border border-app-line rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative m-auto animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between pb-3 border-b border-app-line">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
                  <Edit3 className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-hi">Suggest an Edit to Brand DNA</h3>
                  <p className="text-xs text-app-mist">Changes update your brand's production brief instantly.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="size-7 rounded-lg border border-app-line bg-app-base flex items-center justify-center text-app-mist hover:text-hi transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-mist mb-1.5">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={form.brandName}
                    onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                    className="w-full bg-app-base border border-app-line rounded-xl px-3.5 py-2 text-xs text-hi focus:outline-none focus:border-app-accent"
                    placeholder="e.g. Creo Studios"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-mist mb-1.5">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={form.igHandle}
                    onChange={(e) => setForm({ ...form, igHandle: e.target.value })}
                    className="w-full bg-app-base border border-app-line rounded-xl px-3.5 py-2 text-xs text-hi focus:outline-none focus:border-app-accent"
                    placeholder="e.g. @creo_studios"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-mist mb-1.5">
                  What do you sell, in one line?
                </label>
                <input
                  type="text"
                  value={form.whatYouSell}
                  onChange={(e) => setForm({ ...form, whatYouSell: e.target.value })}
                  className="w-full bg-app-base border border-app-line rounded-xl px-3.5 py-2 text-xs text-hi focus:outline-none focus:border-app-accent"
                  placeholder="e.g. Artisan coffee roastery and specialty café."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-mist mb-1.5">
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
                            ? "bg-app-accent text-white shadow-xs"
                            : "bg-app-base border border-app-line text-app-mist hover:text-hi"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-mist mb-1.5">
                    Target Audience
                  </label>
                  <textarea
                    rows={2}
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full bg-app-base border border-app-line rounded-xl px-3.5 py-2 text-xs text-hi resize-none focus:outline-none focus:border-app-accent"
                    placeholder="e.g. Urban coffee enthusiasts aged 22-45."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-mist mb-1.5">
                    Core Pain Points
                  </label>
                  <textarea
                    rows={2}
                    value={form.painPoints}
                    onChange={(e) => setForm({ ...form, painPoints: e.target.value })}
                    className="w-full bg-app-base border border-app-line rounded-xl px-3.5 py-2 text-xs text-hi resize-none focus:outline-none focus:border-app-accent"
                    placeholder="e.g. Looking for authentic roast quality and fast morning service."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-mist mb-1.5">
                  Brand Color Palette
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {form.colors.map((color, idx) => (
                    <div key={idx} className="bg-app-base border border-app-line rounded-xl p-2.5 space-y-1.5">
                      <div className="relative w-full h-10 rounded-lg border border-app-line overflow-hidden flex items-center justify-center">
                        <input
                          type="color"
                          value={color.startsWith("#") ? color : "var(--app-surface)"}
                          onChange={(e) => updateColor(idx, e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                        <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: color }} />
                        <Palette className="size-3.5 text-hi/40 drop-shadow z-0" />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-app-mist">Color {idx + 1}</span>
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => updateColor(idx, e.target.value)}
                          className="w-16 font-mono text-[10px] text-hi bg-transparent border-b border-app-line text-right focus:outline-none focus:border-app-accent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-app-line flex items-center justify-between">
              <span className="text-[11px] text-app-mist">Changes sync immediately</span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-app-line bg-app-base text-xs font-medium text-hi hover:bg-app-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBrandDNA}
                  disabled={updateProfileMutation.isPending}
                  className="px-5 py-2 rounded-full bg-app-accent-soft text-app-base text-xs font-bold hover:bg-hi transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Brand DNA"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bento Grid - Two independent columns to eliminate vertical gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 items-start">
        {/* ── LEFT COLUMN: STRATEGY & POSITIONING (Cards 1, 3, 5) ── */}
        <div className="flex flex-col gap-3 md:gap-4">
          {/* ── CARD 1: BRAND VOICE & PERSONALITY ── */}
          <div className="rounded-xl md:rounded-2xl border border-app-line bg-app-surface shadow-sm overflow-hidden flex flex-col">
            <div 
              onClick={() => toggleSection("voice")}
              className="flex items-center justify-between px-3.5 md:px-4 py-2.5 md:py-3 border-b border-app-line bg-app-base/50 cursor-pointer lg:cursor-default select-none"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
                  <Sparkles className="size-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-hi">Brand Voice & Personality</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-full bg-app-accent-soft text-app-base text-[11px] md:text-xs font-bold hover:bg-hi transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Edit3 className="size-3 md:size-3.5" />
                  <span className="hidden sm:inline">Suggest an edit</span>
                  <span className="sm:hidden">Edit</span>
                </button>
                <div className="lg:hidden text-app-accent p-0.5">
                  {openSections.voice ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>

            <div className={`${openSections.voice ? "block" : "hidden lg:block"} p-3.5 md:p-5 space-y-3 md:space-y-3.5`}>
              {/* Summary Line Quote Box */}
              <div className="p-3 md:p-3.5 rounded-xl bg-app-base border border-app-line relative">
                <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist block mb-1">
                  Core Brand Pitch / One-Liner
                </span>
                <p className="text-xs md:text-sm font-medium text-hi leading-relaxed">
                  "{profile?.brand_dna?.summary_line || form.whatYouSell || "Strategic, engaging, and aligned with your target audience brand guidelines."}"
                </p>
              </div>

              {/* Voice Words */}
              <div>
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-app-mist block mb-2">
                  Key Voice Attributes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {toneVoiceWords.map((word: string) => (
                    <span
                      key={word}
                      className="inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[11px] md:text-xs font-semibold bg-app-accent/15 text-app-accent-soft border border-app-accent/30 shadow-xs"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tone Sliders / Metrics */}
              <div className="pt-2.5 md:pt-3 border-t border-app-line/80">
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-app-mist block mb-2 md:mb-2.5">
                  Tone Dimensions & Gauges
                </span>
                <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                  {toneMetrics.map((metric) => (
                    <div key={metric.label} className="bg-app-base border border-app-line rounded-xl p-2.5 md:p-3">
                      <div className="flex items-center justify-between text-[11px] md:text-xs mb-1.5">
                        <span className="text-hi font-medium">{metric.label}</span>
                        <span className="font-mono text-app-accent font-bold">{metric.value}/{metric.max}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-app-surface overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-app-accent to-app-accent-soft"
                          style={{ width: `${(metric.value / metric.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── CARD 2: TARGET AUDIENCE & POSITIONING ── */}
          <div className="rounded-xl md:rounded-2xl border border-app-line bg-app-surface shadow-sm overflow-hidden flex flex-col">
            <div 
              onClick={() => toggleSection("audience")}
              className="flex items-center justify-between px-3.5 md:px-4 py-2.5 md:py-3 border-b border-app-line bg-app-base/50 cursor-pointer lg:cursor-default select-none"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
                  <Target className="size-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-hi">Audience & Positioning</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-app-accent hidden sm:inline">Core Demographics</span>
                <div className="lg:hidden text-app-accent p-0.5">
                  {openSections.audience ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>

            <div className={`${openSections.audience ? "block" : "hidden lg:block"} p-3.5 md:p-5 space-y-2.5 md:space-y-3`}>
              <div className="bg-app-base border border-app-line rounded-xl p-3 md:p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist">
                    Primary Target Demographic
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-accent/15 text-app-accent-soft">
                    Primary Adopters
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium text-hi leading-relaxed">
                  {form.audience || dna.audience_segments?.[0]?.description || "Urban professionals, remote creatives, and high-standard coffee aficionados."}
                </p>
              </div>

              <div className="bg-app-base border border-app-line rounded-xl p-3 md:p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist block mb-1.5">
                  Core Pain Points & Care-Abouts
                </span>
                <p className="text-xs md:text-sm font-medium text-hi leading-relaxed">
                  {form.painPoints || dna.audience_segments?.[0]?.core_pain_point || "Seeking reliable artisan quality, fast morning turnaround, and a warm community space."}
                </p>
              </div>

              {dna.positioning && (
                <div className="bg-app-base border border-app-line rounded-xl p-3 md:p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist block mb-1.5">
                    Strategic Positioning
                  </span>
                  <p className="text-xs text-app-mist leading-relaxed">
                    {dna.positioning}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── CARD 3: CONTENT PILLARS & FORMATS ── */}
          <div className="rounded-xl md:rounded-2xl border border-app-line bg-app-surface shadow-sm overflow-hidden flex flex-col">
            <div 
              onClick={() => toggleSection("pillars")}
              className="flex items-center justify-between px-3.5 md:px-4 py-2.5 md:py-3 border-b border-app-line bg-app-base/50 cursor-pointer lg:cursor-default select-none"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
                  <Layers className="size-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-hi">Content Pillars & Strategy</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-app-accent hidden sm:inline">3 Synthesized Pillars</span>
                <div className="lg:hidden text-app-accent p-0.5">
                  {openSections.pillars ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>

            <div className={`${openSections.pillars ? "block" : "hidden lg:block"} p-3.5 md:p-5 space-y-2.5 md:space-y-3`}>
              {pillars.map((pillar: any, idx: number) => (
                <div key={idx} className="bg-app-base border border-app-line rounded-xl p-3 md:p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs md:text-sm font-bold text-hi tracking-tight">{pillar.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        pillar.funnel_stage === "conversion"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : pillar.funnel_stage === "authority"
                          ? "bg-app-accent/15 text-app-accent-soft border border-app-accent/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {pillar.funnel_stage}
                    </span>
                  </div>
                  <p className="text-xs text-app-mist leading-relaxed">{pillar.rationale}</p>

                  {Array.isArray(pillar.best_formats) && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold uppercase text-app-mist">Best Formats:</span>
                      <div className="flex items-center gap-1.5">
                        {pillar.best_formats.map((fmt: string) => (
                          <span
                            key={fmt}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-app-surface border border-app-line text-[10px] md:text-[11px] text-hi capitalize font-medium"
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
        </div>

        {/* ── RIGHT COLUMN: CREATIVE EXECUTION & ASSETS (Cards 2, 4, 6) ── */}
        <div className="flex flex-col gap-3 md:gap-4">
          {/* ── CARD 4: BRAND COLOR PALETTE & TYPOGRAPHY ── */}
          <div className="rounded-xl md:rounded-2xl border border-app-line bg-app-surface shadow-sm overflow-hidden flex flex-col">
            <div 
              onClick={() => toggleSection("palette")}
              className="flex items-center justify-between px-3.5 md:px-4 py-2.5 md:py-3 border-b border-app-line bg-app-base/50 cursor-pointer lg:cursor-default select-none"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
                  <Palette className="size-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-hi">Visual Palette & Tokens</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-app-mist hidden sm:inline">Click swatch to copy hex</span>
                <div className="lg:hidden text-app-accent p-0.5">
                  {openSections.palette ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>

            <div className={`${openSections.palette ? "block" : "hidden lg:block"} p-3.5 md:p-5 space-y-3 md:space-y-3.5`}>
              {/* Color Swatches Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
                {form.colors.map((hex, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleCopyHex(hex, idx)}
                    className="group relative bg-app-base border border-app-line hover:border-app-accent/50 rounded-xl p-2 md:p-2.5 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                    title="Click to copy hex"
                  >
                    <div
                      className="w-full aspect-[4/3] rounded-lg mb-2 md:mb-2.5 border border-app-line shadow-inner relative flex items-center justify-center"
                      style={{ backgroundColor: hex }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-md px-2 py-1 flex items-center gap-1 text-[10px] text-hi font-medium">
                        {copiedIndex === idx ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                      </div>
                    </div>
                    <p className="text-[10px] md:text-[11px] font-bold text-hi truncate">{colorRoles[idx]}</p>
                    <p className="font-mono text-[9px] md:text-[10px] text-app-mist uppercase tracking-wider mt-0.5">{hex}</p>
                  </div>
                ))}
              </div>

              {/* Typography Pairing */}
              <div className="pt-3 md:pt-4 border-t border-app-line/80 space-y-2.5 md:space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="size-3.5 text-app-accent" />
                  <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-app-mist">
                    Typography Pairing & System
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                  <div className="bg-app-base border border-app-line rounded-xl p-3 md:p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist block mb-1">
                      Headlines / Display
                    </span>
                    <p className="text-sm md:text-base font-bold text-hi tracking-tight">
                      {dna.typography?.headline || "Inter Display · 700 Bold"}
                    </p>
                    <p className="text-[11px] md:text-xs text-app-mist mt-1 font-sans">
                      Bold, punchy titles optimized for feed stops.
                    </p>
                  </div>
                  <div className="bg-app-base border border-app-line rounded-xl p-3 md:p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist block mb-1">
                      Body Copy / Subtitles
                    </span>
                    <p className="text-sm md:text-base font-normal text-hi">
                      {dna.typography?.body || "Inter Sans · 400 Regular"}
                    </p>
                    <p className="text-[11px] md:text-xs text-app-mist mt-1 font-sans">
                      High legibility for reel captions and poster details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Official Brand Logo Asset (Requirement 2.2) */}
              {(logoData?.brand_logo_url || profile?.brand_logo_url) && (
                <div className="pt-3 md:pt-4 border-t border-app-line/80 space-y-2 md:space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-3.5 text-app-accent" />
                      <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-app-mist">
                        Official Brand Logo Asset
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Production Asset
                    </span>
                  </div>
                  <div className="bg-app-base border border-app-line rounded-xl p-2.5 md:p-3 flex items-center gap-3 md:gap-4">
                    <div className="w-16 md:w-20 h-12 md:h-14 rounded-lg border border-app-line bg-[radial-gradient(#2A3446_1px,transparent_1px)] [background-size:8px_8px] bg-[#0E1524] flex items-center justify-center p-2 shrink-0">
                      <img
                        src={resolveAssetUrl(logoData?.brand_logo_url || profile?.brand_logo_url)}
                        alt="Brand Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-hi truncate">
                        {(logoData?.brand_logo_url || profile?.brand_logo_url)?.split("/").pop()}
                      </p>
                      <p className="text-[10px] md:text-[11px] text-app-mist mt-0.5">
                        Accessible to assigned pod designers, editors & creative leads.
                      </p>
                    </div>
                    <a
                      href={resolveAssetUrl(logoData?.brand_logo_url || profile?.brand_logo_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-app-surface hover:bg-app-line text-app-accent border border-app-line transition-colors"
                      title="View Logo Asset"
                    >
                      <Download className="size-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── CARD 5: DO'S & DON'TS (CREATIVE GUARDRAILS) ── */}
          <div className="rounded-xl md:rounded-2xl border border-app-line bg-app-surface shadow-sm overflow-hidden flex flex-col">
            <div 
              onClick={() => toggleSection("dodont")}
              className="flex items-center justify-between px-3.5 md:px-4 py-2.5 md:py-3 border-b border-app-line bg-app-base/50 cursor-pointer lg:cursor-default select-none"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
                  <Shield className="size-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-hi">Creative Do's & Don'ts</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-app-mist hidden sm:inline">Pod Production Rules</span>
                <div className="lg:hidden text-app-accent p-0.5">
                  {openSections.dodont ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>

            <div className={`${openSections.dodont ? "block" : "hidden lg:block"} p-3.5 md:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-3.5`}>
              {/* Do Column */}
              <div className="bg-app-base border border-emerald-500/20 rounded-xl p-3 md:p-3.5 space-y-2 md:space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Approved (Do)</h4>
                </div>
                <ul className="space-y-1.5 md:space-y-2">
                  {doList.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-hi/90 leading-snug">
                      <span className="size-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Don't Column */}
              <div className="bg-app-base border border-rose-500/20 rounded-xl p-3 md:p-3.5 space-y-2 md:space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-500/20">
                  <AlertCircle className="size-4 text-rose-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Strictly Avoid (Don't)</h4>
                </div>
                <ul className="space-y-1.5 md:space-y-2">
                  {dontList.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-hi/90 leading-snug">
                      <span className="size-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── CARD 6: HIGH-PERFORMING HOOKS & ASSETS ── */}
          <div className="rounded-xl md:rounded-2xl border border-app-line bg-app-surface shadow-sm overflow-hidden flex flex-col">
            <div 
              onClick={() => toggleSection("hooks")}
              className="flex items-center justify-between px-3.5 md:px-4 py-2.5 md:py-3 border-b border-app-line bg-app-base/50 cursor-pointer lg:cursor-default select-none"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="size-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
                  <Zap className="size-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-hi">Campaign Hooks & Brand Files</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-app-accent-soft hidden sm:inline">Sprint Bank</span>
                <div className="lg:hidden text-app-accent p-0.5">
                  {openSections.hooks ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>

            <div className={`${openSections.hooks ? "block" : "hidden lg:block"} p-3.5 md:p-5 space-y-3 md:space-y-3.5`}>
              {/* Hooks */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist block mb-2.5">
                  High-CTR Campaign Hook Angles
                </span>
                <div className="space-y-2">
                  {hooks.map((hook: string, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-app-base border border-app-line flex items-center justify-between gap-3 text-xs text-hi"
                    >
                      <span className="italic">"{hook}"</span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-accent/15 text-app-accent">
                        Approved Hook
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Files */}
              <div className="pt-4 border-t border-app-line/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist block mb-2.5">
                  Brand Files & Assets
                </span>
                <div className="p-4 rounded-xl bg-app-base border border-app-line flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-app-surface border border-app-line flex items-center justify-center text-app-accent">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-hi">Brand Assets & Logo Packs</h5>
                      <p className="text-[11px] text-app-mist">Vector marks, font licenses, guidelines, and raw media</p>
                    </div>
                  </div>
                  <label className={`flex items-center gap-1.5 px-4 py-2 rounded-full border border-app-line bg-app-surface text-xs font-medium text-hi hover:border-app-accent/40 transition-colors cursor-pointer ${isUploading ? "opacity-60 cursor-not-allowed" : ""}`}>
                    {isUploading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin text-app-accent" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" /> Upload assets
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      disabled={isUploading}
                      accept="image/*,video/*,.pdf,.doc,.docx,.zip,.ai,.psd,.eps,.svg,.ttf,.otf,.woff,.woff2"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                {/* Uploaded Files List */}
                {brandFiles.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {brandFiles.map((file: any) => {
                      const isImg = file.mime_type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
                      const isVid = file.mime_type?.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
                      const IconComp = isImg ? ImageIcon : isVid ? Film : FileText;

                      return (
                        <div
                          key={file.id}
                          className="p-3 rounded-xl bg-app-base border border-app-line flex items-center justify-between gap-3 text-xs text-hi hover:border-app-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-8 rounded-lg bg-app-surface border border-app-line flex items-center justify-center text-app-accent shrink-0">
                              <IconComp className="size-4" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="font-semibold text-hi truncate max-w-[200px] sm:max-w-[320px]">{file.name}</p>
                              <p className="text-[10px] text-app-mist">
                                {file.size || "Unknown size"}
                                {file.uploaded_at ? ` · ${new Date(file.uploaded_at).toLocaleDateString()}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={resolveAssetUrl(file.url || file.file_url)}
                              target="_blank"
                              rel="noreferrer"
                              download={file.name}
                              className="p-1.5 rounded-lg border border-app-line bg-app-surface text-app-mist hover:text-hi hover:border-app-accent/40 transition-colors"
                              title="Download file"
                            >
                              <Download className="size-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id)}
                              disabled={deletingId === file.id}
                              className="p-1.5 rounded-lg border border-app-line bg-app-surface text-app-mist hover:text-rose-400 hover:border-rose-500/40 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Remove file"
                            >
                              {deletingId === file.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-2 text-center py-3 text-[11px] text-app-mist/80">
                    No brand files uploaded yet. Vector marks, font licenses, and guidelines will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
