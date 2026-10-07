import { NativeSelect } from "../../ui/NativeSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type AllocationStatus, PodAllocationModal } from "./PodAllocationModal";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { useEffect, useMemo, useState, useRef } from "react";
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
  Check,
  RefreshCw,
} from "lucide-react";

import {
  fetchQuestionnaireState,
  saveQuestionnaireSection,
  saveQuestionnaireSections,
  completeOnboarding,
} from "../../lib/onboarding-api";
import type { AssignedTeamMember } from "../../types/api";
function AdvancedColorPicker({ color, onChange }: { color: string; onChange: (hex: string) => void }) {
  const currentHex = color || "#0D2137";
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center">
      <div
        className="w-8 h-8 rounded-lg cursor-pointer border border-[#2A3446] shadow-sm relative z-10 transition-transform hover:scale-105"
        style={{ backgroundColor: currentHex }}
        onClick={() => setOpen(!open)}
        title="Click to open color picker"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 top-full left-0 bg-[#0B111C] p-3 rounded-xl border border-[#2A3446] shadow-2xl space-y-2.5 min-w-[200px]">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentHex.startsWith("#") ? currentHex : "#0D2137"}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={currentHex}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 bg-[#161F2D] border border-[#2A3446] text-white text-xs px-2.5 py-1.5 rounded-lg font-mono focus:outline-none focus:border-[#7FA0D6]"
                placeholder="#0D2137"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#2A3446]">
              {["#0D2137", "#7FA0D6", "#161F2D", "#F8FAFC", "#D8BF9B", "#E11D48", "#10B981"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onChange(preset);
                    setOpen(false);
                  }}
                  className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-110"
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface StageQuestionnaireProps {
  userId: string;
  initialSection?: SectionKey;
  onComplete: (assignedTeam?: AssignedTeamMember[]) => void;
}

export type SectionKey = "a" | "b" | "c" | "d" | "e" | "f" | "g";

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
  { key: "b", label: "Audience", badge: "B", isCore: true, icon: Users, estMinutes: 3 },
  { key: "c", label: "Voice & Tone", badge: "C", isCore: true, icon: Sliders, estMinutes: 2 },
  { key: "d", label: "Look & Assets", badge: "D", isCore: true, icon: Palette, estMinutes: 2 },
  { key: "e", label: "Production", badge: "E", isCore: true, icon: Camera, estMinutes: 3 },
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

export function StageQuestionnaire({ userId, initialSection, onComplete }: StageQuestionnaireProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSections: SectionKey[] = ["a", "b", "c", "d", "e", "f", "g"];

  const getSavedSection = (): SectionKey | null => {
    // 1. URL search parameters (window.location.search first, then React Router searchParams)
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSec = urlParams.get("section")?.toLowerCase();
        if (urlSec && (validSections as string[]).includes(urlSec)) {
          return urlSec as SectionKey;
        }
      } catch {}
    }
    const param = searchParams.get("section")?.toLowerCase();
    if (param && (validSections as string[]).includes(param)) {
      return param as SectionKey;
    }

    // 2. Storage fallback (sessionStorage first, then localStorage)
    if (typeof window !== "undefined") {
      try {
        const uId = userId || "";
        const sessionVal = (
          (uId && sessionStorage.getItem(`creo_active_section_${uId}`)) ||
          sessionStorage.getItem("creo_active_section")
        )?.toLowerCase();
        if (sessionVal && (validSections as string[]).includes(sessionVal)) {
          return sessionVal as SectionKey;
        }

        const localVal = (
          (uId && localStorage.getItem(`creo_active_section_${uId}`)) ||
          localStorage.getItem("creo_active_section")
        )?.toLowerCase();
        if (localVal && (validSections as string[]).includes(localVal)) {
          return localVal as SectionKey;
        }
      } catch {}
    }

    // 3. Initial section prop
    if (initialSection && validSections.includes(initialSection)) {
      return initialSection;
    }

    return null;
  };

  const [activeSection, setActiveSection] = useState<SectionKey>(() => getSavedSection() || "a");

  useEffect(() => {
    if (!activeSection) return;
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("creo_active_section", activeSection);
        localStorage.setItem("creo_active_section", activeSection);
        if (userId) {
          sessionStorage.setItem(`creo_active_section_${userId}`, activeSection);
          localStorage.setItem(`creo_active_section_${userId}`, activeSection);
        }
      }
    } catch {}

    setSearchParams(
      (prev) => {
        if (prev.get("section") === activeSection) return prev;
        const next = new URLSearchParams(prev);
        next.set("section", activeSection);
        return next;
      },
      { replace: true }
    );
  }, [activeSection, userId, setSearchParams]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [coreUnlocked, setCoreUnlocked] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<SectionKey>>(new Set());
  const [dataInitialized, setDataInitialized] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationBanner, setValidationBanner] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [failedSection, setFailedSection] = useState<SectionKey | null>(null);
  const synthPhase = "Allocating your creative pod…";
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocStatus, setAllocStatus] = useState<AllocationStatus>("working");
  const [allocError, setAllocError] = useState<string | null>(null);
  const allocatedTeamRef = useRef<AssignedTeamMember[] | undefined>(undefined);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // JSON of what the server last acknowledged per section; unchanged sections are never re-sent
  const lastSavedRef = useRef<Partial<Record<SectionKey, string>>>({});
  const serverSectionsRef = useRef<Set<SectionKey>>(new Set());
  const baselineTakenRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const formTopRef = useRef<HTMLDivElement | null>(null);

  // Section form states
  const [secA, setSecA] = useState({
    brand_name: "",
    instagram_handle: "",
    one_liner: "",
    category: "beauty_personal_care",
    products: [{ name: "", description: "", price_band: "mid" }],
    primary_goal: "direct_sales",
    goal_notes: "",
  });

  const [secB, setSecB] = useState({
    ideal_customer: "",
    problem: "",
    why_chosen: "",
    objections: "",
    competitors: [{ handle: "", what_they_do_better: "", where_you_are_stronger: "" }],
    languages: ["english"],
    caption_script: "english_only",
    locations: [{ location: "Metro India" }],
  });

  const [secC, setSecC] = useState({
    humour: 4,
    formality: 4,
    respectfulness: 8,
    energy: 7,
    voice_words: ["warm", "authoritative", "bold"],
    anti_voice_words: ["salesy", "corporate"],
    forbidden_phrases: "",
    admired_brands: [{ brand_name: "", what_you_like: "" }],
  });

  const [secD, setSecD] = useState({
    brand_guidelines: "none",
    colours: [{ hex: "#0B111C", label: "primary" }, { hex: "#7FA0D6", label: "accent" }],
    fonts: "",
    logo_files: [],
    photography_product_shots: [],
    visual_direction: ["clean_minimal"],
    visual_avoid: "",
    reference_accounts: [{ handle: "", what_specifically: "" }],
  });

  const [secE, setSecE] = useState({
    on_camera: ["founder"],
    founder_comfort: "yes_confident",
    shoot_locations: ["our_store_office"],
    shoot_city: "Mumbai",
    availability: ["weekday_morning"],
    samples: "yes",
    format_exclusions: [] as string[],
    cta_destination: "website",
    cta_target: "",
    legal_constraints: "",
    approval_speed: "founder_same_day",
  });

  const [secF, setSecF] = useState({
    best_posts: [{ post_url: "", why_worked: "" }],
    worst_posts: [{ post_url: "", why_failed: "" }],
    frequency: "2-3_weekly",
    what_failed: "",
  });

  const [secG, setSecG] = useState({
    origin: "",
    stands_for: "",
    remembered_for: "",
    vision: "",
  });

  // Load existing questionnaire state
  const queryClient = useQueryClient();
  const { data: qState, isLoading } = useQuery({
    queryKey: ["questionnaire-state", userId],
    queryFn: () => fetchQuestionnaireState(userId),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (qState && !dataInitialized) {
      const completed = new Set<SectionKey>();
      const allKeys: SectionKey[] = ["a", "b", "c", "d", "e", "f", "g"];
      serverSectionsRef.current = new Set(
        allKeys.filter((k) => {
          const section = qState[`section_${k}` as keyof typeof qState];
          return Boolean(section && typeof section === "object" && Object.keys(section).length > 0);
        }),
      );

      if (qState.section_a && Object.keys(qState.section_a).length > 0) {
        setSecA((prev) => ({ ...prev, ...qState.section_a }));
        if (qState.section_a.brand_name) completed.add("a");
      }
      if (qState.section_b && Object.keys(qState.section_b).length > 0) {
        setSecB((prev) => ({ ...prev, ...qState.section_b }));
        if (qState.section_b.ideal_customer) completed.add("b");
      }
      if (qState.section_c && Object.keys(qState.section_c).length > 0) {
        setSecC((prev) => ({ ...prev, ...qState.section_c }));
        if (qState.section_c.voice_words?.length) completed.add("c");
      }
      if (qState.section_d && Object.keys(qState.section_d).length > 0) {
        setSecD((prev) => ({ ...prev, ...qState.section_d }));
        if (qState.section_d.visual_direction?.length) completed.add("d");
      }
      if (qState.section_e && Object.keys(qState.section_e).length > 0) {
        setSecE((prev) => ({ ...prev, ...qState.section_e }));
        if (qState.section_e.shoot_city) completed.add("e");
      }
      if (qState.section_f && Object.keys(qState.section_f).length > 0) {
        setSecF((prev) => ({ ...prev, ...qState.section_f }));
        completed.add("f");
      }
      if (qState.section_g && Object.keys(qState.section_g).length > 0) {
        setSecG((prev) => ({ ...prev, ...qState.section_g }));
        completed.add("g");
      }

      setCompletedSections(completed);

      const isCoreDone = Boolean(
        qState.core_completed ||
        (qState.section_a && (qState.section_a.brand_name || qState.section_a.one_liner) &&
         qState.section_b && qState.section_b.ideal_customer &&
         qState.section_c && (qState.section_c.humour !== undefined || qState.section_c.voice_words?.length) &&
         qState.section_d && (qState.section_d.visual_direction?.length || qState.section_d.colours?.length) &&
         qState.section_e && (qState.section_e.shoot_city || qState.section_e.on_camera?.length))
      );

      if (isCoreDone) {
        setCoreUnlocked(true);
      }

      // Resume at first incomplete section if core is not completed
      const validSections: SectionKey[] = ["a", "b", "c", "d", "e", "f", "g"];
      const effectiveInitial = initialSection && validSections.includes(initialSection) ? initialSection : null;

      const a = qState.section_a;
      const b = qState.section_b;
      const c = qState.section_c;
      const d = qState.section_d;
      const e = qState.section_e;

      const firstIncomplete: SectionKey =
        (!a || (!a.brand_name && !a.one_liner)) ? "a" :
        (!b || !b.ideal_customer) ? "b" :
        (!c || (!c.humour && !c.voice_words?.length)) ? "c" :
        (!d || (!d.visual_direction?.length && !d.colours?.length)) ? "d" :
        (!e || (!e.shoot_city && !e.on_camera?.length)) ? "e" : "f";

      if (!dataInitialized) {
        const savedSec = getSavedSection();
        const serverLast = (qState as any)?.last_active_section as SectionKey | undefined;
        const validServerLast = serverLast && validSections.includes(serverLast) ? serverLast : null;
        const preferredSec = savedSec || validServerLast || effectiveInitial;

        if (preferredSec && validSections.includes(preferredSec)) {
          setActiveSection(preferredSec);
        } else if (!isCoreDone) {
          setActiveSection(firstIncomplete);
        } else {
          setActiveSection("a");
        }
        setDataInitialized(true);
      }
    }
  }, [qState, initialSection]);

  // Current section data getter
  const getCurrentSectionData = (secKey: SectionKey) => {
    switch (secKey) {
      case "a": return secA;
      case "b": return secB;
      case "c": return secC;
      case "d": return secD;
      case "e": return secE;
      case "f": return secF;
      case "g": return secG;
    }
  };

  // Once restored answers are in state, treat the sections the server already has as saved
  useEffect(() => {
    if (!dataInitialized || baselineTakenRef.current) return;
    baselineTakenRef.current = true;
    for (const key of serverSectionsRef.current) {
      lastSavedRef.current[key] = JSON.stringify(getCurrentSectionData(key));
    }
  }, [dataInitialized]);

  const isSectionDirty = (secKey: SectionKey) =>
    lastSavedRef.current[secKey] !== JSON.stringify(getCurrentSectionData(secKey));

  /**
   * Persist one section if it changed since the last acknowledged save.
   * Saves are queued so they reach the server one at a time, in order.
   */
  const persistSection = (secKey: SectionKey): Promise<void> => {
    const data = getCurrentSectionData(secKey);
    const serialized = JSON.stringify(data);
    const run = async () => {
      if (lastSavedRef.current[secKey] === serialized) return;
      const res = await saveQuestionnaireSection(userId, secKey, data);
      lastSavedRef.current[secKey] = serialized;
      if (res.core_completed) setCoreUnlocked(true);
    };
    const queued = saveQueueRef.current.then(run, run);
    saveQueueRef.current = queued.catch(() => {});
    return queued;
  };

  // Debounced autosave — only sends a request when the active section actually changed
  useEffect(() => {
    if (!dataInitialized || isSaving || isSynthesizing) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      if (!isSectionDirty(activeSection)) return;
      persistSection(activeSection).catch((err) => console.warn("Autosave notification:", err));
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [activeSection, secA, secB, secC, secD, secE, secF, secG, dataInitialized, isSaving, isSynthesizing, userId]);

  // Clear errors when changing field or section
  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
    if (validationBanner) setValidationBanner(null);
  };

  // Section Client-Side Validation Rules
  const validateCurrentSection = (secKey: SectionKey): { valid: boolean; errors: Record<string, string>; firstKey?: string } => {
    const errors: Record<string, string> = {};
    let firstKey: string | undefined;

    const addErr = (key: string, msg: string) => {
      errors[key] = msg;
      if (!firstKey) firstKey = key;
    };

    if (secKey === "a") {
      if (!secA.brand_name || secA.brand_name.trim().length < 2) {
        addErr("brand_name", "Please enter your brand name (at least 2 characters).");
      }
      const igHandle = secA.instagram_handle.trim();
      const igRegex = /^@?[a-zA-Z0-9._]{1,30}$/;
      if (!igHandle || !igRegex.test(igHandle)) {
        addErr("instagram_handle", "Please enter a valid Instagram handle (e.g. @yourbrand).");
      }
      if (!secA.one_liner || secA.one_liner.trim().length < 10) {
        addErr("one_liner", "Please describe what your brand does in one concise sentence (min 10 characters).");
      }
      if (!secA.category) {
        addErr("category", "Please select a primary category.");
      }
      if (!secA.primary_goal) {
        addErr("primary_goal", "Please select the single outcome that matters most.");
      }
      const firstProdName = secA.products?.[0]?.name?.trim();
      if (!firstProdName) {
        addErr("products", "Please enter at least one primary product or service offering.");
      }
    } else if (secKey === "b") {
      if (!secB.ideal_customer || secB.ideal_customer.trim().length < 10) {
        addErr("ideal_customer", "Please describe your ideal customer profile (min 10 characters).");
      }
      if (!secB.problem || secB.problem.trim().length < 10) {
        addErr("problem", "Please describe the core friction point or problem you solve.");
      }
      if (!secB.why_chosen || secB.why_chosen.trim().length < 10) {
        addErr("why_chosen", "Please explain why customers choose you over alternatives.");
      }
      if (!secB.languages || secB.languages.length === 0) {
        addErr("languages", "Please select at least one primary audience language.");
      }
      if (!secB.caption_script) {
        addErr("caption_script", "Please select a caption and script format.");
      }
    } else if (secKey === "c") {
      if (!secC.voice_words || secC.voice_words.length < 2) {
        addErr("voice_words", "Please select at least 2 words that describe your brand voice.");
      }
      if (!secC.anti_voice_words || secC.anti_voice_words.length < 1) {
        addErr("anti_voice_words", "Please select at least 1 word your brand voice must NEVER be.");
      }
    } else if (secKey === "d") {
      if (!secD.brand_guidelines) {
        addErr("brand_guidelines", "Please indicate if you have existing brand guidelines.");
      }
      if (!secD.colours || secD.colours.length === 0) {
        addErr("colours", "Please provide at least one brand colour.");
      }
      if (!secD.visual_direction || secD.visual_direction.length === 0) {
        addErr("visual_direction", "Please select at least 1 visual direction style.");
      }
    } else if (secKey === "e") {
      if (!secE.on_camera || secE.on_camera.length === 0) {
        addErr("on_camera", "Please select at least one option for who can appear on camera.");
      }
      if (!secE.shoot_locations || secE.shoot_locations.length === 0) {
        addErr("shoot_locations", "Please select at least one shoot location.");
      }
      if (!secE.shoot_city || secE.shoot_city.trim().length < 2) {
        addErr("shoot_city", "Please enter the city for physical shoots.");
      }
      if (!secE.cta_destination) {
        addErr("cta_destination", "Please select a CTA destination.");
      }
    }
    // Sections F & G are optional, so errors remain empty

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      firstKey,
    };
  };

  // Tone preview calculation
  const liveSentencePreview = useMemo(() => {
    return generateTonePreview(
      Number(secC.humour || 0),
      Number(secC.formality || 0),
      Number(secC.respectfulness || 0),
      Number(secC.energy || 0)
    );
  }, [secC.humour, secC.formality, secC.respectfulness, secC.energy]);

  // Handle Save & Continue with strict validation, background async saving, and section progression
  const handleNextSection = async () => {
    // 1. Client-Side Validation
    const { valid, errors, firstKey } = validateCurrentSection(activeSection);
    if (!valid) {
      setFieldErrors(errors);
      setValidationBanner("Please complete the required fields before continuing.");

      // Smooth scroll to the first invalid field
      if (firstKey) {
        const el = document.getElementById(`field-${firstKey}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          if ("focus" in el && typeof el.focus === "function") {
            el.focus();
          }
        }
      }
      return;
    }

    // 2. Clear any prior validation errors
    setFieldErrors({});
    setValidationBanner(null);
    setApiError(null);

    // Cancel pending debounce timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // 3. Advance immediately — the answers are already validated and held in state
    const savedSection = activeSection;
    setCompletedSections((prev) => new Set([...prev, savedSection]));
    const currentIndex = SECTIONS.findIndex((s) => s.key === savedSection);
    const nextSec = SECTIONS[currentIndex + 1];
    if (nextSec) {
      setActiveSection(nextSec.key);
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // 4. Persist the finished section in the background
    await saveSectionInBackground(savedSection);
  };

  const saveSectionInBackground = async (secKey: SectionKey) => {
    setIsSaving(true);
    setFailedSection(null);
    try {
      await persistSection(secKey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1200);
    } catch (err) {
      console.error("Save & Continue API failure:", err);
      setFailedSection(secKey);
      setApiError(
        `We couldn't save Section ${secKey.toUpperCase()} yet. Your answers are kept on this page — click Retry, or they'll be saved when you finish.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevSection = () => {
    const currentIndex = SECTIONS.findIndex((s) => s.key === activeSection);
    const prevSec = SECTIONS[currentIndex - 1];
    if (prevSec) {
      setFieldErrors({});
      setValidationBanner(null);
      setApiError(null);
      setActiveSection(prevSec.key);
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectSectionTab = (targetKey: SectionKey) => {
    const inMemoryCore = Boolean(
      (secA.brand_name || secA.one_liner) &&
      secB.ideal_customer &&
      (secC.humour !== undefined || secC.voice_words?.length) &&
      (secD.visual_direction?.length || secD.colours?.length) &&
      (secE.shoot_city || secE.on_camera?.length)
    );

    if ((targetKey === "f" || targetKey === "g") && !coreUnlocked && !inMemoryCore) {
      setValidationBanner("Please complete mandatory Sections A–E before proceeding to optional creative enrichment.");
      return;
    }

    if (inMemoryCore && !coreUnlocked) {
      setCoreUnlocked(true);
    }

    const targetIdx = SECTIONS.findIndex((s) => s.key === targetKey);
    const currentIdx = SECTIONS.findIndex((s) => s.key === activeSection);

    if (targetIdx <= currentIdx || completedSections.has(targetKey) || coreUnlocked || inMemoryCore) {
      setFieldErrors({});
      setValidationBanner(null);
      setApiError(null);
      if (isSectionDirty(activeSection)) {
        void saveSectionInBackground(activeSection);
      }
      setActiveSection(targetKey);
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Trying to jump ahead into an unfinished mandatory section
      setValidationBanner(`Please complete Section ${activeSection.toUpperCase()} before jumping forward.`);
    }
  };

  const handleSynthesizeAndFinish = async () => {
    if (isSynthesizing) return;

    // 1. Client-Side Validation: Verify Sections A through E
    const mandatorySections: SectionKey[] = ["a", "b", "c", "d", "e"];
    for (const secKey of mandatorySections) {
      const { valid, errors, firstKey } = validateCurrentSection(secKey);
      if (!valid) {
        setActiveSection(secKey);
        setFieldErrors(errors);
        setValidationBanner(`Please complete the required fields in Section ${secKey.toUpperCase()} before synthesizing Brand DNA.`);
        if (firstKey) {
          setTimeout(() => {
            const el = document.getElementById(`field-${firstKey}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              if ("focus" in el && typeof el.focus === "function") {
                el.focus();
              }
            }
          }, 100);
        }
        return;
      }
    }

    setIsSynthesizing(true);
    setApiError(null);
    setValidationBanner(null);
    setAllocError(null);
    setAllocStatus("working");
    setAllocOpen(true);

    // Cancel pending debounce timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    try {
      // Finish pending autosaves, then acknowledge all seven sections in one request.
      // This also prevents an older autosave from overwriting the final snapshot.
      await saveQueueRef.current;
      const allSections: SectionKey[] = ["a", "b", "c", "d", "e", "f", "g"];
      const snapshot = Object.fromEntries(allSections.map(key => [key, getCurrentSectionData(key)]));
      const saved = await saveQuestionnaireSections(userId, snapshot, activeSection);
      queryClient.setQueryData(["questionnaire-state", userId], {
        ...qState, ...saved, last_active_section: activeSection,
        ...Object.fromEntries(allSections.map(key => [`section_${key}`, snapshot[key]])),
      });
      for (const key of allSections) lastSavedRef.current[key] = JSON.stringify(snapshot[key]);

      // 3. Allocate the pod and generate the workspace. This call is fast: the Gemini
      // summary of sections A–G and the team brief are produced on the server afterwards
      // and delivered to the team lead and specialists, not to the client.
      const completeRes = await completeOnboarding(userId);
      allocatedTeamRef.current = completeRes.assigned_team;
      setAllocStatus("success");
    } catch (err: unknown) {
      console.error("Failed to complete onboarding", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setIsSynthesizing(false);
      if (errMsg.includes("Sections A-E")) {
        setAllocOpen(false);
        setActiveSection("a");
        setValidationBanner("Please review and submit Sections A–E before finalizing your workspace.");
      } else {
        setAllocError(errMsg || null);
        setAllocStatus("error");
      }
    }
  };

  const labelFor = (options: { value: string; label: string }[], value: unknown, fallback: string) =>
    options.find((o) => o.value === value)?.label ?? fallback;
  const allocationAesthetic = labelFor(
    VISUAL_DIRECTION_OPTIONS,
    Array.isArray(secD.visual_direction) ? secD.visual_direction[0] : undefined,
    "chosen visual",
  );
  const allocationOutcome = labelFor(GOAL_OPTIONS, secA.primary_goal, "your primary goal");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#7FA0D6]" />
        <p className="text-xs text-[#97A0B3] font-medium">Restoring your brand discovery session...</p>
      </div>
    );
  }

  return (
    <div ref={formTopRef} className="w-full space-y-4 sm:space-y-5 onboarding-dark-canvas" style={{ colorScheme: "dark" }}>
      <PodAllocationModal
        open={allocOpen}
        status={allocStatus}
        aesthetic={allocationAesthetic}
        outcome={allocationOutcome}
        errorMessage={allocError}
        onDone={() => {
          setAllocOpen(false);
          setIsSynthesizing(false);
          onComplete(allocatedTeamRef.current);
        }}
        onRetry={() => void handleSynthesizeAndFinish()}
        onClose={() => setAllocOpen(false)}
      />

      {/* Core Discovery Complete Shortcut Banner */}
      {coreUnlocked && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-200 shadow-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">
              <strong className="text-emerald-300">Core Discovery Complete!</strong> Sections A–E are recorded. You may proceed directly to allocate your Creative Pod.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSynthesizeAndFinish}
            disabled={isSynthesizing}
            className="px-4 py-2 bg-[#BCCCE6] text-[#0B111C] hover:bg-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSynthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            <span>Allocate my creative pod</span>
          </button>
        </div>
      )}

      {/* Horizontal Section Navigation Tabs: Equal-sized, correctly aligned, showing status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {SECTIONS.map((sec) => {
          const isActive = activeSection === sec.key;
          const isDone = completedSections.has(sec.key);
          const Icon = sec.icon;

          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => handleSelectSectionTab(sec.key)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left w-full transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-[#161F2D] border-2 border-[#BCCCE6] text-white shadow-lg ring-2 ring-[#BCCCE6]/20"
                  : isDone
                  ? "bg-[#161F2D]/90 border-[#7FA0D6]/40 text-[#BCCCE6] hover:border-[#7FA0D6]"
                  : "bg-[#161F2D]/60 border-[#2A3446] text-[#97A0B3] hover:border-[#7FA0D6]/40"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded font-mono ${
                  isActive
                    ? "bg-[#7FA0D6] text-[#0B111C]"
                    : isDone
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                    : "bg-[#0B111C] text-[#97A0B3] border border-[#2A3446]"
                }`}>
                  {isDone ? `✓ ${sec.badge}` : sec.badge}
                </span>
                {!sec.isCore ? (
                  <span className="text-[10px] font-bold text-[#D8BF9B] bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 px-1 py-0.5 rounded shrink-0">
                    Optional
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#7FA0D6] uppercase tracking-wider">
                    {isDone ? "Done" : "Req"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 w-full min-w-0">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#7FA0D6]" : isDone ? "text-emerald-400" : "text-[#97A0B3]"}`} />
                <span className="text-xs font-bold truncate">{sec.label}</span>
              </div>
              <span className="text-[11px] text-[#97A0B3] mt-1 font-medium">~{sec.estMinutes} min</span>
            </button>
          );
        })}
      </div>

      {/* Validation Banner */}
      {validationBanner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs font-semibold flex items-center gap-2"
        >
          <AlertCircle className="size-4 shrink-0 text-rose-400" />
          <span>{validationBanner}</span>
        </motion.div>
      )}

      {/* API Error Banner with Retry */}
      {apiError && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-400" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setApiError(null);
              if (failedSection) void saveSectionInBackground(failedSection);
            }}
            className="px-3 py-1 bg-white text-[#0B111C] rounded-lg font-bold hover:bg-[#BCCCE6] transition-colors shrink-0 flex items-center gap-1"
          >
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      )}

      {/* Main Section Content Form (Full dark theme, high contrast) */}
      <div className="bg-[#161F2D] rounded-xl border border-[#2A3446] p-4 sm:p-6 shadow-xl text-white" style={{ colorScheme: "dark" }}>
        
        {/* SECTION A: BRAND IDENTITY */}
        {activeSection === "a" && (
          <div className="space-y-6">
            <div className="border-b border-[#2A3446] pb-4">
              <h2 className="text-lg font-bold text-white">Section A: Brand Identity</h2>
              <p className="text-xs text-[#97A0B3]">Required · Establishes official naming, social presence, and core category</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="field-brand_name">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  A1: Brand Name (as it appears on screen) <span className="text-rose-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lumina Botanicals"
                  value={secA.brand_name}
                  onChange={(e) => {
                    setSecA({ ...secA, brand_name: e.target.value });
                    clearFieldError("brand_name");
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#0B111C] text-sm text-white placeholder-[#97A0B3] focus:outline-none transition-all ${
                    fieldErrors.brand_name
                      ? "border-rose-500 bg-rose-950/10 focus:border-rose-500"
                      : "border-[#2A3446] focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/30"
                  }`}
                />
                {fieldErrors.brand_name && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.brand_name}
                  </p>
                )}
              </div>

              <div id="field-instagram_handle">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  A2: Instagram Handle <span className="text-rose-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="@yourbrand"
                  value={secA.instagram_handle}
                  onChange={(e) => {
                    setSecA({ ...secA, instagram_handle: e.target.value });
                    clearFieldError("instagram_handle");
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#0B111C] text-sm text-white placeholder-[#97A0B3] focus:outline-none transition-all ${
                    fieldErrors.instagram_handle
                      ? "border-rose-500 bg-rose-950/10 focus:border-rose-500"
                      : "border-[#2A3446] focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/30"
                  }`}
                />
                {fieldErrors.instagram_handle && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.instagram_handle}
                  </p>
                )}
              </div>
            </div>

            <div id="field-one_liner">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#F1F5F9]">
                  A3: In one sentence, what does your brand do? <span className="text-rose-400 font-bold">*</span>
                </label>
                <span className="text-[11px] text-[#97A0B3] font-mono">
                  {secA.one_liner?.length || 0}/180
                </span>
              </div>
              <input
                type="text"
                maxLength={180}
                placeholder="Active botanical skincare formulated specifically for tropical humidity."
                value={secA.one_liner}
                onChange={(e) => {
                  setSecA({ ...secA, one_liner: e.target.value });
                  clearFieldError("one_liner");
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#0B111C] text-sm text-white placeholder-[#97A0B3] focus:outline-none transition-all ${
                  fieldErrors.one_liner
                    ? "border-rose-500 bg-rose-950/10 focus:border-rose-500"
                    : "border-[#2A3446] focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/30"
                }`}
              />
              {fieldErrors.one_liner && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.one_liner}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="field-category">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  A4: Primary Category <span className="text-rose-400 font-bold">*</span>
                </label>
                <NativeSelect
                  value={secA.category}
                  onChange={(e) => {
                    setSecA({ ...secA, category: e.target.value });
                    clearFieldError("category");
                  }}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-sm text-white focus:border-[#7FA0D6] focus:outline-none cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#0B111C] text-white">
                      {c.label}
                    </option>
                  ))}
                </NativeSelect>
                {fieldErrors.category && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.category}
                  </p>
                )}
              </div>

              <div id="field-primary_goal">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  A6: Single Outcome That Matters Most <span className="text-rose-400 font-bold">*</span>
                </label>
                <NativeSelect
                  value={secA.primary_goal}
                  onChange={(e) => {
                    setSecA({ ...secA, primary_goal: e.target.value });
                    clearFieldError("primary_goal");
                  }}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-sm text-white focus:border-[#7FA0D6] focus:outline-none cursor-pointer"
                >
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value} className="bg-[#0B111C] text-white">
                      {g.label}
                    </option>
                  ))}
                </NativeSelect>
                {fieldErrors.primary_goal && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.primary_goal}
                  </p>
                )}
              </div>
            </div>

            <div id="field-products">
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-2">
                A5: Products / Services (Most important first) <span className="text-rose-400 font-bold">*</span>
              </label>
              <div className="space-y-3">
                {secA.products?.map((prod, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-[#0B111C] border border-[#2A3446] rounded-xl">
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
                        clearFieldError("products");
                      }}
                      className="w-full sm:w-1/3 px-3 py-2 text-xs bg-[#161F2D] text-white rounded-lg border border-[#2A3446] placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
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
                      className="w-full sm:w-1/2 px-3 py-2 text-xs bg-[#161F2D] text-white rounded-lg border border-[#2A3446] placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
                    />
                    <NativeSelect
                      value={prod.price_band}
                      style={{ colorScheme: "dark" }}
                      onChange={(e) => {
                        const next = [...(secA.products || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], price_band: e.target.value };
                          setSecA({ ...secA, products: next });
                        }
                      }}
                      className="px-2.5 py-2 text-xs bg-[#161F2D] text-white rounded-lg border border-[#2A3446] focus:border-[#7FA0D6] focus:outline-none"
                    >
                      <option value="budget">Budget</option>
                      <option value="mid">Mid-Tier</option>
                      <option value="premium">Premium</option>
                      <option value="luxury">Luxury</option>
                    </NativeSelect>
                    {secA.products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = secA.products.filter((_, i) => i !== idx);
                          setSecA({ ...secA, products: next });
                        }}
                        className="text-[#97A0B3] hover:text-rose-400 p-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {fieldErrors.products && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.products}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setSecA({ ...secA, products: [...secA.products, { name: "", description: "", price_band: "mid" }] })}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7FA0D6] hover:text-[#BCCCE6] cursor-pointer pt-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Another Product/Offering
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                A7: Anything else about that outcome? (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Specific monthly targets, promotional events, or milestones..."
                value={secA.goal_notes}
                onChange={(e) => setSecA({ ...secA, goal_notes: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION B: AUDIENCE & POSITIONING */}
        {activeSection === "b" && (
          <div className="space-y-6">
            <div className="border-b border-[#2A3446] pb-4">
              <h2 className="text-lg font-bold text-white">Section B: Audience & Positioning</h2>
              <p className="text-xs text-[#97A0B3]">Required · Establishes audience archetype, core pain points, and why they buy</p>
            </div>

            <div id="field-ideal_customer">
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                B1: Describe your ideal customer <span className="text-rose-400 font-bold">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Age range, city tier, occupation, what brands they currently buy, what they read..."
                value={secB.ideal_customer}
                onChange={(e) => {
                  setSecB({ ...secB, ideal_customer: e.target.value });
                  clearFieldError("ideal_customer");
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-[#0B111C] text-white placeholder-[#97A0B3] focus:outline-none transition-all ${
                  fieldErrors.ideal_customer
                    ? "border-rose-500 bg-rose-950/10 focus:border-rose-500"
                    : "border-[#2A3446] focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/30"
                }`}
              />
              {fieldErrors.ideal_customer && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.ideal_customer}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="field-problem">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  B2: What core problem are they trying to solve? <span className="text-rose-400 font-bold">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Daily friction point, pain, or unaddressed issue..."
                  value={secB.problem}
                  onChange={(e) => {
                    setSecB({ ...secB, problem: e.target.value });
                    clearFieldError("problem");
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-[#0B111C] text-white placeholder-[#97A0B3] focus:outline-none transition-all ${
                    fieldErrors.problem
                      ? "border-rose-500 bg-rose-950/10 focus:border-rose-500"
                      : "border-[#2A3446] focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/30"
                  }`}
                />
                {fieldErrors.problem && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.problem}
                  </p>
                )}
              </div>

              <div id="field-why_chosen">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  B3: Why do customers choose you over alternatives? <span className="text-rose-400 font-bold">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Unique ingredients, verified speed, premium materials, warranty..."
                  value={secB.why_chosen}
                  onChange={(e) => {
                    setSecB({ ...secB, why_chosen: e.target.value });
                    clearFieldError("why_chosen");
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-[#0B111C] text-white placeholder-[#97A0B3] focus:outline-none transition-all ${
                    fieldErrors.why_chosen
                      ? "border-rose-500 bg-rose-950/10 focus:border-rose-500"
                      : "border-[#2A3446] focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/30"
                  }`}
                />
                {fieldErrors.why_chosen && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.why_chosen}
                  </p>
                )}
              </div>
            </div>

            {/* B4: Objections Asset Box */}
            <div className="bg-[#0B111C] border border-[#D8BF9B]/30 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-[#D8BF9B] font-bold text-xs mb-1">
                <Sparkles className="w-4 h-4 text-[#D8BF9B]" />
                <span>B4: Why might someone hesitate before buying? (Crucial Conversion Asset)</span>
              </div>
              <p className="text-xs text-[#97A0B3] mb-2 leading-relaxed">
                Every objection here converts directly into high-converting video and carousel pillars.
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Price point feels high, skeptical about claims, return shipping or sizing..."
                value={secB.objections}
                onChange={(e) => setSecB({ ...secB, objections: e.target.value })}
                style={{ colorScheme: "dark" }}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#161F2D] border border-[#2A3446] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="field-languages">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  B6: Primary Audience Languages <span className="text-rose-400 font-bold">*</span>
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
                          clearFieldError("languages");
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6]"
                            : "bg-[#0B111C] text-[#BCCCE6] border-[#2A3446] hover:border-[#7FA0D6]/60"
                        }`}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.languages && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.languages}
                  </p>
                )}
              </div>

              <div id="field-caption_script">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  B7: Caption & Script Format <span className="text-rose-400 font-bold">*</span>
                </label>
                <NativeSelect
                  value={secB.caption_script}
                  onChange={(e) => {
                    setSecB({ ...secB, caption_script: e.target.value });
                    clearFieldError("caption_script");
                  }}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:border-[#7FA0D6] focus:outline-none cursor-pointer"
                >
                  {SCRIPT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#0B111C] text-white">
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
                {fieldErrors.caption_script && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.caption_script}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION C: VOICE & TONE FRAMEWORK */}
        {activeSection === "c" && (
          <div className="space-y-6">
            <div className="border-b border-[#2A3446] pb-4">
              <h2 className="text-lg font-bold text-white">Section C: Voice & Tone Framework</h2>
              <p className="text-xs text-[#97A0B3]">
                Four validated bipolar scales (NN/g) + anti-tone negative constraints (~2 min)
              </p>
            </div>

            {/* Live Preview Box */}
            <div className="bg-[#0B111C] text-white rounded-xl p-4 border border-[#2A3446] shadow-md">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#7FA0D6] mb-1 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                <span>Live Voice Synthesizer Preview</span>
              </div>
              <p className="text-sm font-medium italic text-[#BCCCE6] mt-1">
                {liveSentencePreview}
              </p>
            </div>

            {/* 4 Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#0B111C] p-4 rounded-xl border border-[#2A3446]">
                <div className="flex justify-between items-center text-xs font-bold text-[#F1F5F9] mb-2">
                  <span>C1: Serious</span>
                  <span className="font-mono text-[#7FA0D6]">{secC.humour}/10</span>
                  <span>Funny</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.humour}
                  onChange={(e) => setSecC({ ...secC, humour: Number(e.target.value) })}
                  style={{ colorScheme: "dark" }}
                  className="w-full accent-[#7FA0D6] cursor-pointer bg-transparent"
                />
              </div>

              <div className="bg-[#0B111C] p-4 rounded-xl border border-[#2A3446]">
                <div className="flex justify-between items-center text-xs font-bold text-[#F1F5F9] mb-2">
                  <span>C2: Formal</span>
                  <span className="font-mono text-[#7FA0D6]">{secC.formality}/10</span>
                  <span>Casual</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.formality}
                  onChange={(e) => setSecC({ ...secC, formality: Number(e.target.value) })}
                  style={{ colorScheme: "dark" }}
                  className="w-full accent-[#7FA0D6] cursor-pointer bg-transparent"
                />
              </div>

              <div className="bg-[#0B111C] p-4 rounded-xl border border-[#2A3446]">
                <div className="flex justify-between items-center text-xs font-bold text-[#F1F5F9] mb-2">
                  <span>C3: Respectful</span>
                  <span className="font-mono text-[#7FA0D6]">{secC.respectfulness}/10</span>
                  <span>Irreverent</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.respectfulness}
                  onChange={(e) => setSecC({ ...secC, respectfulness: Number(e.target.value) })}
                  style={{ colorScheme: "dark" }}
                  className="w-full accent-[#7FA0D6] cursor-pointer bg-transparent"
                />
              </div>

              <div className="bg-[#0B111C] p-4 rounded-xl border border-[#2A3446]">
                <div className="flex justify-between items-center text-xs font-bold text-[#F1F5F9] mb-2">
                  <span>C4: Matter-of-Fact</span>
                  <span className="font-mono text-[#7FA0D6]">{secC.energy}/10</span>
                  <span>Enthusiastic</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={secC.energy}
                  onChange={(e) => setSecC({ ...secC, energy: Number(e.target.value) })}
                  style={{ colorScheme: "dark" }}
                  className="w-full accent-[#7FA0D6] cursor-pointer bg-transparent"
                />
              </div>
            </div>

            {/* C5: Words that describe voice */}
            <div id="field-voice_words">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#F1F5F9]">
                  C5: Pick up to 4 words that describe your voice <span className="text-rose-400 font-bold">*</span>
                </label>
                <span className="text-xs text-[#97A0B3] font-mono">
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
                        clearFieldError("voice_words");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6]"
                          : "bg-[#0B111C] text-[#BCCCE6] border-[#2A3446] hover:border-[#7FA0D6]/60"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.voice_words && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.voice_words}
                </p>
              )}
            </div>

            {/* C6: Anti-tone Guardrail */}
            <div id="field-anti_voice_words" className="bg-[#0B111C] border border-rose-900/40 rounded-xl p-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>C6: Pick up to 4 words your voice must NEVER be (Hard Guardrails) <span className="text-rose-400 font-bold">*</span></span>
                </label>
                <span className="text-xs text-rose-300 font-mono">
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
                        clearFieldError("anti_voice_words");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                          : "bg-[#161F2D] text-rose-200 border-rose-900/50 hover:border-rose-700"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.anti_voice_words && (
                <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.anti_voice_words}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                C7: Words, phrases or claims we must never use
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Miracle cure, Guaranteed 10x, Cheap, Discount, Hack..."
                value={secC.forbidden_phrases}
                onChange={(e) => setSecC({ ...secC, forbidden_phrases: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION D: LOOK & ASSETS */}
        {activeSection === "d" && (
          <div className="space-y-6">
            <div className="border-b border-[#2A3446] pb-4">
              <h2 className="text-lg font-bold text-white">Section D: Visual Direction & Assets</h2>
              <p className="text-xs text-[#97A0B3]">Required · Supplies our graphic designers & animators (~2 min)</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="field-brand_guidelines">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  D1: Do you have existing brand guidelines? <span className="text-rose-400 font-bold">*</span>
                </label>
                <NativeSelect
                  value={secD.brand_guidelines}
                  onChange={(e) => {
                    setSecD({ ...secD, brand_guidelines: e.target.value });
                    clearFieldError("brand_guidelines");
                  }}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:border-[#7FA0D6] focus:outline-none cursor-pointer"
                >
                  <option value="yes_will_upload">Yes, will upload full guidelines PDF</option>
                  <option value="partial">Partial (We have logo & colors only)</option>
                  <option value="none">None (Creo will establish visual palette)</option>
                </NativeSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  D3: Primary Brand Fonts (if any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Montserrat, Playfair Display, Inter"
                  value={secD.fonts}
                  onChange={(e) => setSecD({ ...secD, fonts: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
                />
              </div>
            </div>

            {/* D2: Brand Colours */}
            <div id="field-colours">
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-2">
                D2: Brand Hex Colours <span className="text-rose-400 font-bold">*</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {secD.colours?.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-[#0B111C] border border-[#2A3446] rounded-xl">
                    <AdvancedColorPicker
                      color={col.hex}
                      onChange={(newHex) => {
                        const next = [...(secD.colours || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], hex: newHex };
                          setSecD({ ...secD, colours: next });
                        }
                        clearFieldError("colours");
                      }}
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
                      className="w-20 px-2 py-1 text-xs font-mono bg-[#161F2D] border border-[#2A3446] text-white rounded-lg uppercase"
                    />
                    <NativeSelect
                      value={col.label}
                      style={{ colorScheme: "dark" }}
                      onChange={(e) => {
                        const next = [...(secD.colours || [])];
                        if (next[idx]) {
                          next[idx] = { ...next[idx], label: e.target.value };
                          setSecD({ ...secD, colours: next });
                        }
                      }}
                      className="text-xs bg-[#161F2D] text-white border border-[#2A3446] rounded-lg px-2 py-1"
                    >
                      <option value="primary">Primary</option>
                      <option value="accent">Accent</option>
                      <option value="background">Background</option>
                    </NativeSelect>
                    {secD.colours.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = secD.colours.filter((_, i) => i !== idx);
                          setSecD({ ...secD, colours: next });
                        }}
                        className="text-[#97A0B3] hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSecD({ ...secD, colours: [...secD.colours, { hex: "#7FA0D6", label: "accent" }] })}
                  className="px-3.5 py-2 border border-dashed border-[#2A3446] hover:border-[#7FA0D6] rounded-xl text-xs font-bold text-[#7FA0D6] hover:text-[#BCCCE6] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Color
                </button>
              </div>
              {fieldErrors.colours && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.colours}
                </p>
              )}
            </div>

            {/* D6: Visual Direction */}
            <div id="field-visual_direction">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#F1F5F9]">
                  D6: Visual Direction (Pick up to 3) <span className="text-rose-400 font-bold">*</span>
                </label>
                <span className="text-xs text-[#97A0B3] font-mono">
                  {secD.visual_direction?.length || 0}/3 selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                        clearFieldError("visual_direction");
                      }}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6] shadow-sm"
                          : "bg-[#0B111C] text-[#BCCCE6] border-[#2A3446] hover:border-[#7FA0D6]/60 hover:text-white"
                      }`}
                    >
                      {vd.label}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.visual_direction && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.visual_direction}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                D7: Visual styles, colours or treatments to strictly avoid
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Neon gradients, loud yellow text, stock photo handshakes, chaotic fast cuts..."
                value={secD.visual_avoid}
                onChange={(e) => setSecD({ ...secD, visual_avoid: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION E: PRODUCTION REALITY */}
        {activeSection === "e" && (
          <div className="space-y-6">
            <div className="border-b border-[#2A3446] pb-4">
              <h2 className="text-lg font-bold text-white">Section E: Production Reality & Constraints</h2>
              <p className="text-xs text-[#97A0B3]">
                Required · The facts an editor, shoot coordinator, and producer need before Monday (~3 min)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="field-on_camera">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  E1: Who can appear on camera? <span className="text-rose-400 font-bold">*</span>
                </label>
                <div className="space-y-2">
                  {ON_CAMERA_OPTIONS.map((opt) => {
                    const isChecked = secE.on_camera?.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2.5 text-xs text-[#BCCCE6] cursor-pointer p-2 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/40">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const current = secE.on_camera || [];
                            const next = isChecked
                              ? current.filter((x: string) => x !== opt.value)
                              : [...current, opt.value];
                            setSecE({ ...secE, on_camera: next });
                            clearFieldError("on_camera");
                          }}
                          className="rounded border-[#2A3446] text-[#7FA0D6] accent-[#7FA0D6]"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                {fieldErrors.on_camera && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.on_camera}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  E2: Is the founder comfortable on camera? <span className="text-rose-400 font-bold">*</span>
                </label>
                <NativeSelect
                  value={secE.founder_comfort}
                  onChange={(e) => setSecE({ ...secE, founder_comfort: e.target.value })}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:border-[#7FA0D6] focus:outline-none mb-4 cursor-pointer"
                >
                  <option value="yes_confident">Yes, confident & experienced</option>
                  <option value="yes_with_direction">Yes, with teleprompter & direction</option>
                  <option value="prefers_voiceover">Prefers voiceover only</option>
                  <option value="no">No, will not film</option>
                </NativeSelect>

                <div id="field-shoot_locations">
                  <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                    E3: Where can we shoot? <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <div className="space-y-2 mb-4">
                    {SHOOT_LOCATION_OPTIONS.map((loc) => {
                      const isChecked = secE.shoot_locations?.includes(loc.value);
                      return (
                        <label key={loc.value} className="flex items-center gap-2.5 text-xs text-[#BCCCE6] cursor-pointer p-2 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/40">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const current = secE.shoot_locations || [];
                              const next = isChecked
                                ? current.filter((x: string) => x !== loc.value)
                                : [...current, loc.value];
                              setSecE({ ...secE, shoot_locations: next });
                              clearFieldError("shoot_locations");
                            }}
                            className="rounded border-[#2A3446] text-[#7FA0D6] accent-[#7FA0D6]"
                          />
                          <span>{loc.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors.shoot_locations && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.shoot_locations}
                    </p>
                  )}
                </div>

                <div id="field-shoot_city">
                  <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                    E4: City for Physical Shoots <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Bengaluru, Delhi NCR"
                    value={secE.shoot_city}
                    onChange={(e) => {
                      setSecE({ ...secE, shoot_city: e.target.value });
                      clearFieldError("shoot_city");
                    }}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-[#0B111C] text-white placeholder-[#97A0B3] focus:outline-none transition-all ${
                      fieldErrors.shoot_city
                        ? "border-rose-500 bg-rose-950/10 focus:border-rose-500"
                        : "border-[#2A3446] focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]/30"
                    }`}
                  />
                  {fieldErrors.shoot_city && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.shoot_city}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="field-cta_destination">
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  E8: Where should content send viewers? <span className="text-rose-400 font-bold">*</span>
                </label>
                <NativeSelect
                  value={secE.cta_destination}
                  onChange={(e) => {
                    setSecE({ ...secE, cta_destination: e.target.value });
                    clearFieldError("cta_destination");
                  }}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:border-[#7FA0D6] focus:outline-none cursor-pointer"
                >
                  {CTA_DESTINATION_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#0B111C] text-white">
                      {c.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  E9: CTA Target Destination URL / Number
                </label>
                <input
                  type="text"
                  placeholder="https://yourbrand.com or +919876543210"
                  value={secE.cta_target}
                  onChange={(e) => setSecE({ ...secE, cta_target: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
                />
              </div>
            </div>

            {/* E10: Regulatory Box */}
            <div className="bg-[#0B111C] border border-rose-900/40 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs mb-1">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>E10: Regulatory or Legal Constraints on Claims (Agency Liability Shield)</span>
              </div>
              <p className="text-xs text-[#97A0B3] mb-2 leading-relaxed">
                e.g. Supplements cannot claim to cure disease; FinTech must carry risk disclaimers; healthcare cannot show patient before/after results.
              </p>
              <textarea
                rows={2}
                placeholder="Explicit claims or terms forbidden by law or compliance..."
                value={secE.legal_constraints}
                onChange={(e) => setSecE({ ...secE, legal_constraints: e.target.value })}
                style={{ colorScheme: "dark" }}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#161F2D] border border-rose-900/60 text-white placeholder-[#97A0B3] focus:border-rose-500 focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  E11: Who approves content and how fast? <span className="text-rose-400 font-bold">*</span>
                </label>
                <NativeSelect
                  value={secE.approval_speed}
                  onChange={(e) => setSecE({ ...secE, approval_speed: e.target.value })}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:border-[#7FA0D6] focus:outline-none cursor-pointer"
                >
                  <option value="founder_same_day">Founder (Same Day Turnaround)</option>
                  <option value="founder_2_3_days">Founder (2–3 Days)</option>
                  <option value="marketing_team">Marketing Team Lead (24h SLA)</option>
                  <option value="committee_slower">Review Committee (48h+ SLA)</option>
                </NativeSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
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
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                          isExcl
                            ? "bg-rose-900/50 text-rose-300 border-rose-700 font-semibold"
                            : "bg-[#0B111C] text-[#BCCCE6] border-[#2A3446] hover:border-[#7FA0D6]/50"
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

        {/* SECTION F: HISTORICAL DATA (OPTIONAL) */}
        {activeSection === "f" && (
          <div className="space-y-6">
            <div className="border-b border-[#2A3446] pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Section F: Historical Content Data</h2>
                <span className="text-[11px] font-bold bg-[#D8BF9B]/20 text-[#D8BF9B] border border-[#D8BF9B]/30 px-2 py-0.5 rounded-full">
                  Optional Enrichment
                </span>
              </div>
              <p className="text-xs text-[#97A0B3] mt-1">Helps our team avoid repeating what flopped before (~2 min)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                F4: Anything that has clearly NOT worked before?
              </label>
              <textarea
                rows={3}
                placeholder="Styles, topics, formats, or angles that flopped or generated negative engagement..."
                value={secF.what_failed}
                onChange={(e) => setSecF({ ...secF, what_failed: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION G: STORY & VISION (OPTIONAL) */}
        {activeSection === "g" && (
          <div className="space-y-6">
            <div className="border-b border-[#2A3446] pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Section G: Founder Story & Long-Term Vision</h2>
                <span className="text-[11px] font-bold bg-[#D8BF9B]/20 text-[#D8BF9B] border border-[#D8BF9B]/30 px-2 py-0.5 rounded-full">
                  Optional Enrichment
                </span>
              </div>
              <p className="text-xs text-[#97A0B3] mt-1">
                Keep these in your own authentic words — they inform our copywriters and narrative strategists.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                G1: Why was the brand started?
              </label>
              <textarea
                rows={3}
                placeholder="The inciting moment, frustration with the industry, or origin story..."
                value={secG.origin}
                onChange={(e) => setSecG({ ...secG, origin: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                G2: What does your brand stand for today?
              </label>
              <textarea
                rows={2}
                placeholder="Core conviction, moral stance, or uncompromising standard..."
                value={secG.stands_for}
                onChange={(e) => setSecG({ ...secG, stands_for: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  G3: What do you want people to remember you for?
                </label>
                <textarea
                  rows={2}
                  placeholder="The lingering feeling or reputation you want to hold..."
                  value={secG.remembered_for}
                  onChange={(e) => setSecG({ ...secG, remembered_for: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
                  G4: Where do you want the brand in 1–3 years?
                </label>
                <textarea
                  rows={2}
                  placeholder="Market share, global reach, revenue milestone, or new product verticals..."
                  value={secG.vision}
                  onChange={(e) => setSecG({ ...secG, vision: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#2A3446] bg-[#0B111C] text-white placeholder-[#97A0B3] focus:border-[#7FA0D6] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-[#2A3446] mt-8 gap-4">
          <button
            type="button"
            onClick={handlePrevSection}
            disabled={activeSection === "a"}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-[#97A0B3] text-xs font-bold hover:text-white hover:border-[#7FA0D6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous Section</span>
          </button>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={async () => {
                setIsSaving(true);
                try {
                  await persistSection(activeSection);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 2000);
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#161F2D] hover:border-[#7FA0D6] text-xs font-bold text-[#BCCCE6] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin text-[#7FA0D6]" />
              ) : saveSuccess ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <RefreshCw className="size-3.5 text-[#7FA0D6]" />
              )}
              <span>{isSaving ? "Syncing..." : saveSuccess ? "Synced ✓" : "Sync Draft"}</span>
            </button>
            {activeSection !== "g" ? (
              <button
                type="button"
                onClick={handleNextSection}
                className="w-full sm:w-auto min-w-[200px] px-6 py-3 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#0B111C] text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-[#0B111C]" />
                    <span>Saved ✓</span>
                  </>
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSynthesizeAndFinish}
                disabled={isSynthesizing}
                className="w-full sm:w-auto min-w-[240px] px-6 py-2.5 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#0B111C] text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
              >
                {isSynthesizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B111C]" />
                    <span>{synthPhase}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#0B111C]" />
                    <span>Finish & allocate my pod</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StageQuestionnaire;
