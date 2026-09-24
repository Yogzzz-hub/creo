import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  Palette,
  Camera,
  History,
  BookOpen,
  Sliders,
  ShieldAlert,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import {
  fetchQuestionnaireState,
  saveQuestionnaireSection,
  queueBrandDNAGeneration,
  completeOnboarding,
} from "../../lib/onboarding-api";
import type { AssignedTeamMember } from "../../types/api";

interface StageQuestionnaireProps {
  userId: string;
  onComplete: (assignedTeam?: AssignedTeamMember[]) => void;
}

type SectionKey = "a" | "b" | "c" | "d" | "e" | "f" | "g";

interface SectionMeta {
  key: SectionKey;
  label: string;
  badge: string;
  isCore: boolean;
  icon: typeof Building2;
  estMinutes: number;
}

const SECTIONS: SectionMeta[] = [
  { key: "a", label: "Identity", badge: "A", isCore: true, icon: Building2, estMinutes: 2 },
  { key: "b", label: "Audience & Positioning", badge: "B", isCore: true, icon: Users, estMinutes: 3 },
  { key: "c", label: "Voice & Tone", badge: "C", isCore: true, icon: Sliders, estMinutes: 2 },
  { key: "d", label: "Look & Assets", badge: "D", isCore: true, icon: Palette, estMinutes: 2 },
  { key: "e", label: "Production Reality", badge: "E", isCore: true, icon: Camera, estMinutes: 3 },
  { key: "f", label: "History", badge: "F", isCore: false, icon: History, estMinutes: 2 },
  { key: "g", label: "Brand Story", badge: "G", isCore: false, icon: BookOpen, estMinutes: 3 },
];

const CATEGORY_OPTIONS = [
  { value: "d2c_fashion", label: "D2C Fashion & Apparel" },
  { value: "beauty_personal_care", label: "Beauty & Personal Care" },
  { value: "food_fnb", label: "Food & Beverage (F&B)" },
  { value: "fitness_wellness", label: "Fitness & Wellness" },
  { value: "b2b_saas", label: "B2B SaaS & Tech" },
  { value: "professional_services", label: "Professional Services" },
  { value: "education", label: "Education & EdTech" },
  { value: "healthcare", label: "Healthcare & MedTech" },
  { value: "real_estate", label: "Real Estate & Architecture" },
  { value: "jewellery", label: "Jewellery & Luxury Goods" },
  { value: "hospitality", label: "Hospitality & Travel" },
  { value: "other", label: "Other Category" },
];

const GOAL_OPTIONS = [
  { value: "brand_awareness", label: "Brand Awareness (Reach & Recall)" },
  { value: "lead_generation", label: "Lead Generation (DMs & Inquiries)" },
  { value: "direct_sales", label: "Direct Sales & E-commerce Conversions" },
  { value: "community_building", label: "Community & Audience Retention" },
  { value: "recruitment", label: "Employer Branding & Recruitment" },
  { value: "investor_credibility", label: "Investor & Industry Authority" },
];

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
  { value: "malayalam", label: "Malayalam" },
  { value: "marathi", label: "Marathi" },
  { value: "bengali", label: "Bengali" },
  { value: "gujarati", label: "Gujarati" },
  { value: "punjabi", label: "Punjabi" },
  { value: "other", label: "Other" },
];

const SCRIPT_OPTIONS = [
  { value: "english_only", label: "English Only" },
  { value: "native_script", label: "Native Script (e.g. தமிழ் / हिन्दी)" },
  { value: "roman_transliteration", label: "Roman Transliteration (Hinglish/Tanglish in Latin alphabet)" },
  { value: "mixed", label: "Mixed (Dynamic English + Vernacular phrases)" },
];

const VOICE_WORDS_POOL = [
  "warm", "bold", "calm", "witty", "authoritative", "playful",
  "minimal", "premium", "friendly", "direct", "aspirational",
  "technical", "nurturing", "rebellious", "trustworthy", "energetic",
];

const ANTI_VOICE_WORDS_POOL = [
  ...VOICE_WORDS_POOL,
  "salesy", "corporate", "preachy", "gimmicky", "desperate", "cutesy",
];

const VISUAL_DIRECTION_OPTIONS = [
  { value: "clean_minimal", label: "Clean & Minimalist" },
  { value: "bold_graphic", label: "Bold & High-Contrast Graphic" },
  { value: "warm_editorial", label: "Warm & Editorial Lifestyle" },
  { value: "cinematic_moody", label: "Cinematic & Moody" },
  { value: "bright_playful", label: "Bright & Playful Pop" },
  { value: "luxury_restrained", label: "Luxury & Restrained Elegance" },
  { value: "documentary_raw", label: "Documentary & Raw Behind-the-Scenes" },
  { value: "retro_nostalgic", label: "Retro & Nostalgic Vintage" },
];

const ON_CAMERA_OPTIONS = [
  { value: "founder", label: "Founder / Executive" },
  { value: "team_members", label: "Internal Team Members" },
  { value: "customers", label: "Real Customers (Case Studies/Testimonials)" },
  { value: "professional_model", label: "Professional Actors / Models" },
  { value: "voiceover_only", label: "Voiceover Only (No Face on Camera)" },
  { value: "no_people_product_only", label: "No People (Product / Motion Graphics Only)" },
];

const SHOOT_LOCATION_OPTIONS = [
  { value: "our_store_office", label: "Our Store / Office / Facility" },
  { value: "client_home", label: "Client / Founder Residence" },
  { value: "studio_you_arrange", label: "Production Studio (Arranged by Agency)" },
  { value: "outdoor_location", label: "Public / Outdoor Location" },
  { value: "we_will_send_footage", label: "We Will Ship Footage to You" },
  { value: "no_shoot_possible", label: "No In-Person Shoot Possible" },
];

const FORMAT_EXCLUSIONS_OPTIONS = [
  { value: "dancing_trends", label: "Dancing Trends" },
  { value: "meme_formats", label: "Meme Formats" },
  { value: "founder_face_to_camera", label: "Founder Talking Head" },
  { value: "customer_testimonials", label: "Customer Testimonials" },
  { value: "price_led_offers", label: "Discount / Price-Led Promos" },
  { value: "festival_content", label: "Generic Festival Greetings" },
];

const CTA_DESTINATION_OPTIONS = [
  { value: "website", label: "Brand Website / E-commerce Store" },
  { value: "whatsapp", label: "WhatsApp Business Chat" },
  { value: "dm", label: "Instagram Direct Message (DM)" },
  { value: "phone_call", label: "Direct Phone Call" },
  { value: "physical_store", label: "Physical Store Location" },
  { value: "app_download", label: "App Store / Play Store Download" },
  { value: "no_destination_awareness_only", label: "No Destination (Awareness Only)" },
];

function generateTonePreview(humour: number, formality: number, respectfulness: number, energy: number): string {
  let opener = "We are pleased to introduce our newest collection.";
  if (formality > 6 && humour > 6) {
    opener = "Okay don't panic, but our latest drop just landed and it's ridiculously good.";
  } else if (formality > 6) {
    opener = "Hey everyone! Our new release is officially live and ready for you.";
  } else if (humour > 6) {
    opener = "We promised ourselves we wouldn't hype this up, but honestly? Just look at it.";
  } else if (formality < 4 && humour < 4) {
    opener = "We are privileged to announce the immediate release of our verified collection.";
  }

  let middle = "Formulated for reliable, high-standard daily performance.";
  if (energy > 7) {
    middle = "Built with relentless speed, uncompromising power, and pure craft!";
  } else if (energy < 4) {
    middle = "Quietly engineered for understated, long-term dependability.";
  }

  let closer = "Available now via the link.";
  if (respectfulness > 7) {
    closer = "Rules were made to be bent. Grab yours before everyone else catches on.";
  } else if (respectfulness < 3) {
    closer = "We remain at your service and invite your esteemed feedback.";
  } else if (energy > 6) {
    closer = "Check it out right now — let's build something extraordinary together!";
  }

  return `"${opener} ${middle} ${closer}"`;
}

export function StageQuestionnaire({ userId, onComplete }: StageQuestionnaireProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("a");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [coreUnlocked, setCoreUnlocked] = useState(false);
  const [, setBrandDNAResult] = useState<any>(null);

  // Section form state
  const [secA, setSecA] = useState<any>({
    brand_name: "",
    instagram_handle: "",
    one_liner: "",
    category: "beauty_personal_care",
    products: [{ name: "", description: "", price_band: "mid" }],
    primary_goal: "direct_sales",
    goal_notes: "",
  });

  const [secB, setSecB] = useState<any>({
    ideal_customer: "",
    problem: "",
    why_chosen: "",
    objections: "",
    competitors: [{ handle: "", what_they_do_better: "", where_you_are_stronger: "" }],
    languages: ["english"],
    caption_script: "english_only",
    locations: [{ location: "Metro India" }],
  });

  const [secC, setSecC] = useState<any>({
    humour: 4,
    formality: 4,
    respectfulness: 8,
    energy: 7,
    voice_words: ["warm", "authoritative", "bold"],
    anti_voice_words: ["salesy", "corporate"],
    forbidden_phrases: "",
    admired_brands: [{ brand_name: "", what_you_like: "" }],
  });

  const [secD, setSecD] = useState<any>({
    brand_guidelines: "none",
    colours: [{ hex: "#0D2137", label: "primary" }, { hex: "#2B7BC4", label: "accent" }],
    fonts: "",
    logo_files: [],
    photography_product_shots: [],
    visual_direction: ["clean_minimal"],
    visual_avoid: "",
    reference_accounts: [{ handle: "", what_specifically: "" }],
  });

  const [secE, setSecE] = useState<any>({
    on_camera: ["founder"],
    founder_comfort: "yes_confident",
    shoot_locations: ["our_store_office"],
    shoot_city: "Mumbai",
    availability: ["weekday_morning"],
    samples: "yes",
    format_exclusions: [],
    cta_destination: "website",
    cta_target: "",
    legal_constraints: "",
    approval_speed: "founder_same_day",
  });

  const [secF, setSecF] = useState<any>({
    best_posts: [{ post_url: "", why_worked: "" }],
    worst_posts: [{ post_url: "", why_failed: "" }],
    frequency: "2-3_weekly",
    what_failed: "",
  });

  const [secG, setSecG] = useState<any>({
    origin: "",
    stands_for: "",
    remembered_for: "",
    vision: "",
  });

  // Load existing questionnaire state to restore previous answers on abandon/return
  const { data: qState, isLoading } = useQuery({
    queryKey: ["questionnaire-state", userId],
    queryFn: () => fetchQuestionnaireState(userId),
  });

  useEffect(() => {
    if (qState) {
      if (qState.section_a && Object.keys(qState.section_a).length > 0) setSecA((prev: any) => ({ ...prev, ...qState.section_a }));
      if (qState.section_b && Object.keys(qState.section_b).length > 0) setSecB((prev: any) => ({ ...prev, ...qState.section_b }));
      if (qState.section_c && Object.keys(qState.section_c).length > 0) setSecC((prev: any) => ({ ...prev, ...qState.section_c }));
      if (qState.section_d && Object.keys(qState.section_d).length > 0) setSecD((prev: any) => ({ ...prev, ...qState.section_d }));
      if (qState.section_e && Object.keys(qState.section_e).length > 0) setSecE((prev: any) => ({ ...prev, ...qState.section_e }));
      if (qState.section_f && Object.keys(qState.section_f).length > 0) setSecF((prev: any) => ({ ...prev, ...qState.section_f }));
      if (qState.section_g && Object.keys(qState.section_g).length > 0) setSecG((prev: any) => ({ ...prev, ...qState.section_g }));

      if (qState.core_completed) {
        setCoreUnlocked(true);
      }
    }
  }, [qState]);

  // Autosave current section helper
  const handleSaveCurrentSection = async (secKey: SectionKey, secData: any) => {
    setIsSaving(true);
    try {
      const res = await saveQuestionnaireSection(userId, secKey, secData);
      if (res.core_completed) {
        setCoreUnlocked(true);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Autosave failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Live sentence preview
  const liveSentencePreview = useMemo(() => {
    return generateTonePreview(
      Number(secC.humour || 0),
      Number(secC.formality || 0),
      Number(secC.respectfulness || 0),
      Number(secC.energy || 0)
    );
  }, [secC.humour, secC.formality, secC.respectfulness, secC.energy]);

  const handleNextSection = async () => {
    // Save current active section
    let currentData = secA;
    if (activeSection === "b") currentData = secB;
    else if (activeSection === "c") currentData = secC;
    else if (activeSection === "d") currentData = secD;
    else if (activeSection === "e") currentData = secE;
    else if (activeSection === "f") currentData = secF;
    else if (activeSection === "g") currentData = secG;

    await handleSaveCurrentSection(activeSection, currentData);

    const currentIndex = SECTIONS.findIndex((s) => s.key === activeSection);
    const nextSec = SECTIONS[currentIndex + 1];
    if (nextSec) {
      setActiveSection(nextSec.key);
    }
  };

  const handlePrevSection = () => {
    const currentIndex = SECTIONS.findIndex((s) => s.key === activeSection);
    const prevSec = SECTIONS[currentIndex - 1];
    if (prevSec) {
      setActiveSection(prevSec.key);
    }
  };

  const handleSynthesizeAndFinish = async () => {
    setIsSynthesizing(true);
    try {
      // Save section E
      await handleSaveCurrentSection("e", secE);
      // Trigger Brand DNA synthesis pipeline
      const genRes = await queueBrandDNAGeneration(userId);
      setBrandDNAResult(genRes.brand_dna);

      // Complete onboarding and fetch assigned creative pod
      const completeRes = await completeOnboarding(userId);
      onComplete(completeRes.assigned_team);
    } catch (err) {
      console.error("Failed to complete onboarding", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#2B7BC4]" />
        <p className="text-sm text-slate-500 font-medium">Restoring your brand discovery session...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0D2137] via-[#122E4C] to-[#0D2137] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2B7BC4] mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Production Intake & Brand DNA Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Creo Production Intelligence Blueprint
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Sections A–E configure our editor, designer, and shoot director (~10 min).
              Sections F–G are optional creative enrichment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {coreUnlocked && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Calendar Ready</span>
              </div>
            )}
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-mono">
                {isSaving ? "Autosaving..." : saveSuccess ? "Saved ✓" : "Autosave Active"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Gate Notification Banner if Core is Complete */}
      {coreUnlocked && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-200"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">
              <strong>Core Discovery Complete!</strong> Your production parameters are locked and calendar generation is unlocked.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSynthesizeAndFinish}
            disabled={isSynthesizing}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {isSynthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            <span>Proceed to Calendar Directly</span>
          </button>
        </motion.div>
      )}

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {SECTIONS.map((sec) => {
          const isActive = activeSection === sec.key;
          const Icon = sec.icon;
          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => setActiveSection(sec.key)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left w-full overflow-hidden transition-all cursor-pointer ${
                isActive
                  ? "bg-[#2B7BC4]/10 border-[#2B7BC4] text-[#0D2137] shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-500">
                  {sec.badge}
                </span>
                {!sec.isCore && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded shrink-0">
                    Optional
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 w-full min-w-0">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#2B7BC4]" : "text-slate-400"}`} />
                <span className="text-[11px] sm:text-xs font-bold truncate">{sec.label}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">~{sec.estMinutes} min</span>
            </button>
          );
        })}
      </div>

      {/* Main Section Content Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        {/* SECTION A: IDENTITY */}
        {activeSection === "a" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section A: Brand Identity</h2>
              <p className="text-xs text-slate-500">Required · Takes ~2 min to complete</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  A1: Brand Name (as it appears on screen) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lumina Botanicals"
                  value={secA.brand_name}
                  onChange={(e) => setSecA({ ...secA, brand_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  A2: Instagram Handle *
                </label>
                <input
                  type="text"
                  required
                  placeholder="@yourbrand"
                  value={secA.instagram_handle}
                  onChange={(e) => setSecA({ ...secA, instagram_handle: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4] outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  A3: In one sentence, what does your brand do? *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {secA.one_liner?.length || 0}/180
                </span>
              </div>
              <input
                type="text"
                maxLength={180}
                required
                placeholder="Active botanical skincare formulated specifically for tropical humidity."
                value={secA.one_liner}
                onChange={(e) => setSecA({ ...secA, one_liner: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  A4: Primary Category *
                </label>
                <select
                  value={secA.category}
                  onChange={(e) => setSecA({ ...secA, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4] outline-none bg-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  A6: Single Outcome That Matters Most *
                </label>
                <select
                  value={secA.primary_goal}
                  onChange={(e) => setSecA({ ...secA, primary_goal: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4] outline-none bg-white"
                >
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                A5: Products / Services (Most important first) *
              </label>
              <div className="space-y-2.5">
                {secA.products?.map((prod: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="text"
                      placeholder="Product / Service Name"
                      value={prod.name}
                      onChange={(e) => {
                        const next = [...(secA.products || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], name: e.target.value };
                          setSecA({ ...secA, products: next });
                        }
                      }}
                      className="w-full sm:w-1/3 px-2.5 py-1.5 text-xs bg-white rounded border border-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="One-line description / core benefit"
                      value={prod.description}
                      onChange={(e) => {
                        const next = [...(secA.products || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], description: e.target.value };
                          setSecA({ ...secA, products: next });
                        }
                      }}
                      className="w-full sm:w-1/2 px-2.5 py-1.5 text-xs bg-white rounded border border-slate-200"
                    />
                    <select
                      value={prod.price_band}
                      onChange={(e) => {
                        const next = [...(secA.products || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], price_band: e.target.value };
                          setSecA({ ...secA, products: next });
                        }
                      }}
                      className="px-2 py-1.5 text-xs bg-white rounded border border-slate-200"
                    >
                      <option value="budget">Budget</option>
                      <option value="mid">Mid-Tier</option>
                      <option value="premium">Premium</option>
                      <option value="luxury">Luxury</option>
                    </select>
                    {secA.products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = secA.products.filter((_: any, i: number) => i !== idx);
                          setSecA({ ...secA, products: next });
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSecA({ ...secA, products: [...secA.products, { name: "", description: "", price_band: "mid" }] })}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2B7BC4] hover:text-[#1a5b96] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Product/Offering
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                A7: Anything else about that outcome? (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Specific monthly targets, promotional events, or milestones..."
                value={secA.goal_notes}
                onChange={(e) => setSecA({ ...secA, goal_notes: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION B: AUDIENCE & POSITIONING */}
        {activeSection === "b" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section B: Audience & Positioning</h2>
              <p className="text-xs text-slate-500">Required · Defines hooks and angles (~3 min)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                B1: Describe your ideal customer *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Age range, city tier, occupation, what brands they currently buy, what they read..."
                value={secB.ideal_customer}
                onChange={(e) => setSecB({ ...secB, ideal_customer: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  B2: What core problem are they trying to solve? *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Daily friction point, pain, or unaddressed issue..."
                  value={secB.problem}
                  onChange={(e) => setSecB({ ...secB, problem: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  B3: Why do customers choose you over alternatives? *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Unique ingredients, verified speed, premium materials, warranty..."
                  value={secB.why_chosen}
                  onChange={(e) => setSecB({ ...secB, why_chosen: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:border-[#2B7BC4] outline-none"
                />
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs mb-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>B4: Why might someone hesitate before buying? (Crucial Content Asset) ★</span>
              </div>
              <p className="text-[11px] text-amber-800 mb-2">
                Every objection here converts directly into high-converting conversion pillars. (e.g. &quot;Too expensive&quot; becomes a value-breakdown reel).
              </p>
              <textarea
                rows={3}
                required
                placeholder="e.g. Price point feels high, skeptical about claims, concerned about return shipping or sizing..."
                value={secB.objections}
                onChange={(e) => setSecB({ ...secB, objections: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-amber-300 focus:border-[#2B7BC4] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  B6: Primary Audience Languages (Select all that apply) *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const isSelected = secB.languages?.includes(lang.value);
                    return (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => {
                          const current = secB.languages || [];
                          const next = isSelected
                            ? current.filter((x: string) => x !== lang.value)
                            : [...current, lang.value];
                          setSecB({ ...secB, languages: next });
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#2B7BC4] text-white border-[#2B7BC4]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  B7: Caption & Script Format *
                </label>
                <select
                  value={secB.caption_script}
                  onChange={(e) => setSecB({ ...secB, caption_script: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none"
                >
                  {SCRIPT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
        {activeSection === "c" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section C: Voice & Tone Framework</h2>
              <p className="text-xs text-slate-500">
                Four validated bipolar scales (NN/g) + anti-tone negative constraints (~2 min)
              </p>
            </div>

            {/* Live Preview Box */}
            <div className="bg-gradient-to-r from-slate-900 to-[#122E4C] text-white rounded-xl p-4 border border-slate-800 shadow-md">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#2B7BC4] mb-1 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                <span>Live Voice Synthesizer Preview</span>
              </div>
              <p className="text-sm font-medium italic text-slate-100 mt-1">
                {liveSentencePreview}
              </p>
            </div>

            {/* 4 Bipolar Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* C1: Humour */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                  <span>C1: Serious</span>
                  <span className="font-mono text-[#2B7BC4]">{secC.humour}/10</span>
                  <span>Funny</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.humour}
                  onChange={(e) => setSecC({ ...secC, humour: Number(e.target.value) })}
                  className="w-full accent-[#2B7BC4] cursor-pointer"
                />
              </div>

              {/* C2: Formality */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                  <span>C2: Formal</span>
                  <span className="font-mono text-[#2B7BC4]">{secC.formality}/10</span>
                  <span>Casual</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.formality}
                  onChange={(e) => setSecC({ ...secC, formality: Number(e.target.value) })}
                  className="w-full accent-[#2B7BC4] cursor-pointer"
                />
              </div>

              {/* C3: Respectfulness */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                  <span>C3: Respectful</span>
                  <span className="font-mono text-[#2B7BC4]">{secC.respectfulness}/10</span>
                  <span>Irreverent</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.respectfulness}
                  onChange={(e) => setSecC({ ...secC, respectfulness: Number(e.target.value) })}
                  className="w-full accent-[#2B7BC4] cursor-pointer"
                />
              </div>

              {/* C4: Energy */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                  <span>C4: Matter-of-Fact</span>
                  <span className="font-mono text-[#2B7BC4]">{secC.energy}/10</span>
                  <span>Enthusiastic</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.energy}
                  onChange={(e) => setSecC({ ...secC, energy: Number(e.target.value) })}
                  className="w-full accent-[#2B7BC4] cursor-pointer"
                />
              </div>
            </div>

            {/* C5: Words that describe voice */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  C5: Pick up to 4 words that describe your voice *
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {secC.voice_words?.length || 0}/4 selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VOICE_WORDS_POOL.map((word) => {
                  const isSelected = secC.voice_words?.includes(word);
                  return (
                    <button
                      key={word}
                      type="button"
                      onClick={() => {
                        const current = secC.voice_words || [];
                        if (isSelected) {
                          setSecC({ ...secC, voice_words: current.filter((x: string) => x !== word) });
                        } else if (current.length < 4) {
                          setSecC({ ...secC, voice_words: [...current, word] });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C6: Anti-tone words (Crucial Guardrail) */}
            <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>C6: Pick up to 4 words your voice must NEVER be (Hard Guardrails) ★</span>
                </label>
                <span className="text-[11px] text-rose-700 font-mono">
                  {secC.anti_voice_words?.length || 0}/4 selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ANTI_VOICE_WORDS_POOL.map((word) => {
                  const isSelected = secC.anti_voice_words?.includes(word);
                  return (
                    <button
                      key={word}
                      type="button"
                      onClick={() => {
                        const current = secC.anti_voice_words || [];
                        if (isSelected) {
                          setSecC({ ...secC, anti_voice_words: current.filter((x: string) => x !== word) });
                        } else if (current.length < 4) {
                          setSecC({ ...secC, anti_voice_words: [...current, word] });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-white text-slate-700 border-rose-200 hover:border-rose-300"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C7: Forbidden Phrases */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                C7: Words, phrases or claims we must never use
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Miracle cure, Guaranteed 10x, Cheap, Discount, Hack..."
                value={secC.forbidden_phrases}
                onChange={(e) => setSecC({ ...secC, forbidden_phrases: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION D: LOOK & ASSETS */}
        {activeSection === "d" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section D: Visual Direction & Assets</h2>
              <p className="text-xs text-slate-500">Required · Supplies our graphic designers & animators (~2 min)</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  D1: Do you have existing brand guidelines? *
                </label>
                <select
                  value={secD.brand_guidelines}
                  onChange={(e) => setSecD({ ...secD, brand_guidelines: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none"
                >
                  <option value="yes_will_upload">Yes, will upload full guidelines PDF</option>
                  <option value="partial">Partial (We have logo & colors only)</option>
                  <option value="none">None (Creo will establish visual palette)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  D3: Primary Brand Fonts (if any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Montserrat, Playfair Display, Inter"
                  value={secD.fonts}
                  onChange={(e) => setSecD({ ...secD, fonts: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
                />
              </div>
            </div>

            {/* D2: Brand Colours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                D2: Brand Hex Colours *
              </label>
              <div className="flex flex-wrap gap-2.5">
                {secD.colours?.map((col: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <input
                      type="color"
                      value={col.hex}
                      onChange={(e) => {
                        const next = [...(secD.colours || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], hex: e.target.value };
                          setSecD({ ...secD, colours: next });
                        }
                      }}
                      className="w-8 h-8 rounded border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={col.hex}
                      onChange={(e) => {
                        const next = [...(secD.colours || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], hex: e.target.value };
                          setSecD({ ...secD, colours: next });
                        }
                      }}
                      className="w-20 px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded uppercase"
                    />
                    <select
                      value={col.label}
                      onChange={(e) => {
                        const next = [...(secD.colours || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], label: e.target.value };
                          setSecD({ ...secD, colours: next });
                        }
                      }}
                      className="text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                    >
                      <option value="primary">Primary</option>
                      <option value="accent">Accent</option>
                      <option value="background">Background</option>
                    </select>
                    {secD.colours.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = secD.colours.filter((_: any, i: number) => i !== idx);
                          setSecD({ ...secD, colours: next });
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSecD({ ...secD, colours: [...secD.colours, { hex: "#2B7BC4", label: "accent" }] })}
                  className="px-3 py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-[#2B7BC4] hover:border-[#2B7BC4] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Color
                </button>
              </div>
            </div>

            {/* D6: Visual Direction */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  D6: Visual Direction (Pick up to 3) *
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {secD.visual_direction?.length || 0}/3 selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VISUAL_DIRECTION_OPTIONS.map((vd) => {
                  const isSelected = secD.visual_direction?.includes(vd.value);
                  return (
                    <button
                      key={vd.value}
                      type="button"
                      onClick={() => {
                        const current = secD.visual_direction || [];
                        if (isSelected) {
                          setSecD({ ...secD, visual_direction: current.filter((x: string) => x !== vd.value) });
                        } else if (current.length < 3) {
                          setSecD({ ...secD, visual_direction: [...current, vd.value] });
                        }
                      }}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#2B7BC4] text-white border-[#2B7BC4] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {vd.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* D7: Visual avoid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                D7: Visual styles, colours or treatments to strictly avoid ★
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Neon gradients, loud yellow text, stock photo handshakes, chaotic fast cuts..."
                value={secD.visual_avoid}
                onChange={(e) => setSecD({ ...secD, visual_avoid: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION E: PRODUCTION REALITY */}
        {activeSection === "e" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section E: Production Reality & Constraints</h2>
              <p className="text-xs text-slate-500">
                Required · The facts an editor, shoot coordinator, and producer need before Tuesday (~3 min)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E1: Who can appear on camera? *
                </label>
                <div className="space-y-1.5">
                  {ON_CAMERA_OPTIONS.map((opt) => {
                    const isChecked = secE.on_camera?.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 rounded hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const current = secE.on_camera || [];
                            const next = isChecked
                              ? current.filter((x: string) => x !== opt.value)
                              : [...current, opt.value];
                            setSecE({ ...secE, on_camera: next });
                          }}
                          className="rounded text-[#2B7BC4]"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E2: Is the founder comfortable on camera? *
                </label>
                <select
                  value={secE.founder_comfort}
                  onChange={(e) => setSecE({ ...secE, founder_comfort: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none mb-3"
                >
                  <option value="yes_confident">Yes, confident & experienced</option>
                  <option value="yes_with_direction">Yes, with teleprompter & direction</option>
                  <option value="prefers_voiceover">Prefers voiceover only</option>
                  <option value="no">No, will not film</option>
                </select>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E3: Where can we shoot? *
                </label>
                <div className="space-y-1.5 mb-3">
                  {SHOOT_LOCATION_OPTIONS.map((loc) => {
                    const isChecked = secE.shoot_locations?.includes(loc.value);
                    return (
                      <label key={loc.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const current = secE.shoot_locations || [];
                            const next = isChecked
                              ? current.filter((x: string) => x !== loc.value)
                              : [...current, loc.value];
                            setSecE({ ...secE, shoot_locations: next });
                          }}
                          className="rounded text-[#2B7BC4]"
                        />
                        <span>{loc.label}</span>
                      </label>
                    );
                  })}
                </div>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E4: City for Physical Shoots *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai, Bengaluru, Delhi NCR"
                  value={secE.shoot_city}
                  onChange={(e) => setSecE({ ...secE, shoot_city: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E8: Where should content send viewers? *
                </label>
                <select
                  value={secE.cta_destination}
                  onChange={(e) => setSecE({ ...secE, cta_destination: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none"
                >
                  {CTA_DESTINATION_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E9: CTA Target Destination URL / Number
                </label>
                <input
                  type="text"
                  placeholder="https://yourbrand.com or +919876543210"
                  value={secE.cta_target}
                  onChange={(e) => setSecE({ ...secE, cta_target: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
                />
              </div>
            </div>

            {/* E10: Regulatory constraints */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-rose-950 font-bold text-xs mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>E10: Regulatory or Legal Constraints on Claims (Agency Liability Shield) ★</span>
              </div>
              <p className="text-[11px] text-rose-800 mb-2">
                e.g. Supplements cannot claim to cure disease; FinTech must carry risk disclaimers; healthcare cannot show patient before/after results.
              </p>
              <textarea
                rows={2}
                required
                placeholder="Explicit claims or terms forbidden by law or compliance..."
                value={secE.legal_constraints}
                onChange={(e) => setSecE({ ...secE, legal_constraints: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-white border border-rose-300 outline-none"
              />
            </div>

            {/* E11: Approval speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E11: Who approves content and how fast? *
                </label>
                <select
                  value={secE.approval_speed}
                  onChange={(e) => setSecE({ ...secE, approval_speed: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none"
                >
                  <option value="founder_same_day">Founder (Same Day Turnaround)</option>
                  <option value="founder_2_3_days">Founder (2–3 Days)</option>
                  <option value="marketing_team">Marketing Team Lead (24h SLA)</option>
                  <option value="committee_slower">Review Committee (48h+ SLA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E7: Formats you do NOT want produced
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FORMAT_EXCLUSIONS_OPTIONS.map((f) => {
                    const isExcl = secE.format_exclusions?.includes(f.value);
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => {
                          const current = secE.format_exclusions || [];
                          const next = isExcl
                            ? current.filter((x: string) => x !== f.value)
                            : [...current, f.value];
                          setSecE({ ...secE, format_exclusions: next });
                        }}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                          isExcl ? "bg-rose-100 text-rose-700 border-rose-300 font-bold" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION F: HISTORY (OPTIONAL) */}
        {activeSection === "f" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Section F: Historical Content Data</h2>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Optional Enrichment</span>
              </div>
              <p className="text-xs text-slate-500">Helps our team avoid repeating what flopped before (~2 min)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                F4: Anything that has clearly NOT worked before?
              </label>
              <textarea
                rows={3}
                placeholder="Styles, topics, formats, or angles that flopped or generated negative engagement..."
                value={secF.what_failed}
                onChange={(e) => setSecF({ ...secF, what_failed: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}
        {activeSection === "g" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Section G: Founder Story & Long-Term Vision</h2>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Optional Enrichment</span>
              </div>
              <p className="text-xs text-slate-500">
                Keep these in your own authentic words — they inform our copywriters more than any questionnaire scale.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                G1: Why was the brand started?
              </label>
              <textarea
                rows={3}
                placeholder="The inciting moment, frustration with the industry, or origin story..."
                value={secG.origin}
                onChange={(e) => setSecG({ ...secG, origin: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                G2: What does your brand stand for today?
              </label>
              <textarea
                rows={2}
                placeholder="Core conviction, moral stance, or uncompromising standard..."
                value={secG.stands_for}
                onChange={(e) => setSecG({ ...secG, stands_for: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  G3: What do you want people to remember you for?
                </label>
                <textarea
                  rows={2}
                  placeholder="The lingering feeling or reputation you want to hold..."
                  value={secG.remembered_for}
                  onChange={(e) => setSecG({ ...secG, remembered_for: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  G4: Where do you want the brand in 1–3 years?
                </label>
                <textarea
                  rows={2}
                  placeholder="Market share, global reach, revenue milestone, or new product verticals..."
                  value={secG.vision}
                  onChange={(e) => setSecG({ ...secG, vision: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
          <button
            type="button"
            onClick={handlePrevSection}
            disabled={activeSection === "a"}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center gap-3">
            {activeSection !== "g" ? (
              <button
                type="button"
                onClick={handleNextSection}
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-[#2B7BC4] hover:bg-[#1f63a3] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Save & Continue</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSynthesizeAndFinish}
                disabled={isSynthesizing}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isSynthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Synthesize Brand DNA & Finish</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StageQuestionnaire;
