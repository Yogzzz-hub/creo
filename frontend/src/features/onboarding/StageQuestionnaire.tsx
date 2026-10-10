import { NativeSelect } from "../../ui/NativeSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type AllocationStatus, PodAllocationModal } from "./PodAllocationModal";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
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
  Search,
  Pipette,
  X,
} from "lucide-react";

import {
  fetchQuestionnaireState,
  saveQuestionnaireSection,
  saveQuestionnaireSections,
  completeOnboarding,
} from "../../lib/onboarding-api";
import type { AssignedTeamMember } from "../../types/api";
interface PaletteColor {
  name: string;
  hex: string;
  category: "Core & Tech" | "Vibrant & Pop" | "Luxury & Gold" | "Fresh & Nature" | "Warm & Earth" | "Neutrals";
}

const CURATED_PALETTE: PaletteColor[] = [
  // Core & Tech
  { name: "Creo Nebula Blue", hex: "#7FA0D6", category: "Core & Tech" },
  { name: "Deep Space Navy", hex: "#0D2137", category: "Core & Tech" },
  { name: "Electric Indigo", hex: "#6366F1", category: "Core & Tech" },
  { name: "Cobalt Blue", hex: "#2563EB", category: "Core & Tech" },
  { name: "Royal Sapphire", hex: "#1D4ED8", category: "Core & Tech" },
  { name: "Cyber Cyan", hex: "#06B6D4", category: "Core & Tech" },
  { name: "Sky Glaze", hex: "#38BDF8", category: "Core & Tech" },
  { name: "Deep Violet", hex: "#7C3AED", category: "Core & Tech" },
  { name: "Hyper Purple", hex: "#8B5CF6", category: "Core & Tech" },

  // Vibrant & Pop
  { name: "Crimson Rose", hex: "#E11D48", category: "Vibrant & Pop" },
  { name: "Electric Coral", hex: "#F43F5E", category: "Vibrant & Pop" },
  { name: "Sunset Orange", hex: "#F97316", category: "Vibrant & Pop" },
  { name: "Amber Blaze", hex: "#F59E0B", category: "Vibrant & Pop" },
  { name: "Neon Lime", hex: "#84CC16", category: "Vibrant & Pop" },
  { name: "Fuchsia Punch", hex: "#D946EF", category: "Vibrant & Pop" },
  { name: "Hot Magenta", hex: "#EC4899", category: "Vibrant & Pop" },
  { name: "Bright Vermilion", hex: "#EF4444", category: "Vibrant & Pop" },

  // Luxury & Gold
  { name: "Champagne Gold", hex: "#D4AF37", category: "Luxury & Gold" },
  { name: "Desert Sand", hex: "#D8BF9B", category: "Luxury & Gold" },
  { name: "Warm Ochre", hex: "#C59B27", category: "Luxury & Gold" },
  { name: "Rose Quartz", hex: "#E0A899", category: "Luxury & Gold" },
  { name: "Rich Bronze", hex: "#8C6239", category: "Luxury & Gold" },
  { name: "Imperial Burgundy", hex: "#4C1D24", category: "Luxury & Gold" },
  { name: "Tuscan Terracotta", hex: "#C86446", category: "Luxury & Gold" },

  // Fresh & Nature
  { name: "Emerald Prime", hex: "#10B981", category: "Fresh & Nature" },
  { name: "Forest Pine", hex: "#047857", category: "Fresh & Nature" },
  { name: "Deep Teal", hex: "#0D9488", category: "Fresh & Nature" },
  { name: "Mint Crisp", hex: "#34D399", category: "Fresh & Nature" },
  { name: "Sage Mist", hex: "#84A98C", category: "Fresh & Nature" },
  { name: "Olive Green", hex: "#65A30D", category: "Fresh & Nature" },
  { name: "Seafoam Cyan", hex: "#2DD4BF", category: "Fresh & Nature" },

  // Warm & Earth
  { name: "Raw Terracotta", hex: "#9A3412", category: "Warm & Earth" },
  { name: "Clay Brown", hex: "#78350F", category: "Warm & Earth" },
  { name: "Caramel Toffee", hex: "#B45309", category: "Warm & Earth" },
  { name: "Apricot Peach", hex: "#FB923C", category: "Warm & Earth" },
  { name: "Warm Almond", hex: "#E5D4C0", category: "Warm & Earth" },
  { name: "Mustard Spice", hex: "#D97706", category: "Warm & Earth" },

  // Neutrals & Monochrome
  { name: "Pure Snow White", hex: "#FFFFFF", category: "Neutrals" },
  { name: "Off White / Chalk", hex: "#F8FAFC", category: "Neutrals" },
  { name: "Light Slate", hex: "#E2E8F0", category: "Neutrals" },
  { name: "Cool Grey", hex: "#94A3B8", category: "Neutrals" },
  { name: "Muted Steel", hex: "#64748B", category: "Neutrals" },
  { name: "Graphite Charcoal", hex: "#334155", category: "Neutrals" },
  { name: "Dark Slate Navy", hex: "#1E293B", category: "Neutrals" },
  { name: "Creo Deep Dark", hex: "#161F2D", category: "Neutrals" },
  { name: "Midnight Obsidian", hex: "#0B111C", category: "Neutrals" },
  { name: "Pitch Black", hex: "#000000", category: "Neutrals" },
];

interface PalettePopoverProps {
  currentHex?: string;
  title?: string;
  onSelect: (hex: string) => void;
  onClose: () => void;
}

function PalettePopover({
  currentHex = "#7FA0D6",
  title = "Brand Palette & Color Search",
  onSelect,
  onClose,
}: PalettePopoverProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [enteredHex, setEnteredHex] = useState(currentHex);

  useEffect(() => {
    setEnteredHex(currentHex || "#7FA0D6");
  }, [currentHex]);

  const categories = [
    "All",
    "Core & Tech",
    "Vibrant & Pop",
    "Luxury & Gold",
    "Fresh & Nature",
    "Warm & Earth",
    "Neutrals",
  ];

  // Filter palette based on search query and category
  const filteredPalette = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CURATED_PALETTE.filter((item) => {
      const matchesCat = category === "All" || item.category === category;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.hex.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  // Check if search query itself is a valid hex code
  const searchAsHex = useMemo(() => {
    const clean = search.trim();
    if (!clean) return null;
    const withHash = clean.startsWith("#") ? clean : `#${clean}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(withHash) || /^#[0-9A-Fa-f]{3}$/.test(withHash)) {
      return withHash.toUpperCase();
    }
    return null;
  }, [search]);

  const handleApplyHex = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith("#")) clean = `#${clean}`;
    if (/^#[0-9A-Fa-f]{3,8}$/.test(clean)) {
      onSelect(clean.toUpperCase());
      setEnteredHex(clean.toUpperCase());
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 mt-2 top-full left-0 sm:left-auto sm:right-0 bg-[#0B111C] p-3.5 rounded-2xl border border-[#2A3446] shadow-2xl space-y-3 w-[330px] sm:w-[370px] max-w-[92vw]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <Palette className="w-3.5 h-3.5 text-[#7FA0D6]" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#97A0B3] hover:text-white p-1 rounded-md cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Color Entry Row */}
        <div className="bg-[#161F2D] p-2.5 rounded-xl border border-[#2A3446] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#97A0B3]">
            <span>Enter Custom Hex or Pick Color:</span>
            <span className="font-mono text-white text-xs">{enteredHex || currentHex}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Native Color Picker button */}
            <label className="relative cursor-pointer group shrink-0">
              <input
                type="color"
                value={(enteredHex || currentHex).startsWith("#") ? (enteredHex || currentHex) : "#0D2137"}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setEnteredHex(val);
                  onSelect(val);
                }}
                className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
              />
              <div
                className="w-8 h-8 rounded-lg border border-white/20 shadow-inner flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ backgroundColor: enteredHex || currentHex }}
                title="Click for full spectrum color wheel"
              >
                <Pipette className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              </div>
            </label>

            {/* Hex input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={enteredHex}
                onChange={(e) => {
                  setEnteredHex(e.target.value);
                  if (/^#?[0-9A-Fa-f]{6}$/.test(e.target.value.trim())) {
                    handleApplyHex(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyHex(enteredHex);
                  }
                }}
                placeholder="#7FA0D6"
                className="w-full bg-[#0B111C] border border-[#2A3446] text-white text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>

            <button
              type="button"
              onClick={() => handleApplyHex(enteredHex)}
              className="px-2.5 py-1.5 bg-[#7FA0D6] hover:bg-[#9BB7E2] text-[#0B111C] text-xs font-bold rounded-lg cursor-pointer transition-colors shrink-0"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Search Input in that Palette */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#97A0B3] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search colors in palette (e.g. blue, gold, #F43F5E)..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#161F2D] border border-[#2A3446] text-white rounded-xl placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[10px]">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                category === cat
                  ? "bg-[#7FA0D6] text-[#0B111C]"
                  : "bg-[#161F2D] text-[#97A0B3] hover:text-white hover:bg-[#2A3446]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* If search query is a custom hex code, offer direct apply card */}
        {searchAsHex && (
          <div
            onClick={() => {
              onSelect(searchAsHex);
              setEnteredHex(searchAsHex);
            }}
            className="flex items-center justify-between p-2 rounded-xl bg-[#161F2D] border border-[#7FA0D6]/40 hover:border-[#7FA0D6] cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: searchAsHex }}
              />
              <span className="text-xs font-bold text-white">Use Custom Hex: {searchAsHex}</span>
            </div>
            <span className="text-[10px] text-[#7FA0D6] font-semibold">Select ➔</span>
          </div>
        )}

        {/* Scrollable Palette Colors Grid */}
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {filteredPalette.length === 0 && !searchAsHex ? (
            <div className="text-center py-6 text-xs text-[#97A0B3]">
              No palette colors match "{search}". Try another term or enter a custom hex code above.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {filteredPalette.map((item) => {
                const isSelected = (currentHex || "").toUpperCase() === item.hex.toUpperCase();
                return (
                  <button
                    key={item.hex + item.name}
                    type="button"
                    onClick={() => {
                      onSelect(item.hex);
                      setEnteredHex(item.hex);
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#7FA0D6]/20 border-[#7FA0D6] text-white"
                        : "bg-[#161F2D]/70 border-[#2A3446] text-[#BCCCE6] hover:bg-[#161F2D] hover:border-[#7FA0D6]/50"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-lg border border-white/20 shadow-sm shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: item.hex }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate leading-tight text-white">{item.name}</p>
                      <p className="text-[9px] font-mono text-[#97A0B3] uppercase leading-tight">{item.hex}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Brand Presets row */}
        <div className="pt-2 border-t border-[#2A3446]">
          <div className="flex items-center justify-between mb-1.5 text-[10px] text-[#97A0B3]">
            <span>Quick Presets:</span>
            <span>7 popular tones</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {["#0D2137", "#7FA0D6", "#161F2D", "#F8FAFC", "#D8BF9B", "#E11D48", "#10B981"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onSelect(preset);
                  setEnteredHex(preset);
                }}
                className="w-6 h-6 rounded-lg border border-white/20 transition-transform hover:scale-110 active:scale-95 shadow-sm"
                style={{ backgroundColor: preset }}
                title={preset}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AdvancedColorPicker({ color, onChange }: { color: string; onChange: (hex: string) => void }) {
  const currentHex = color || "#0D2137";
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center">
      <div
        className="w-8 h-8 rounded-lg cursor-pointer border border-[#2A3446] shadow-sm relative z-10 transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: currentHex }}
        onClick={() => setOpen(!open)}
        title="Click to open color palette and search"
      />
      {open && (
        <PalettePopover
          currentHex={currentHex}
          title="Edit Brand Color"
          onSelect={(hex) => {
            onChange(hex);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function AddColorPaletteButton({ onAddColor }: { onAddColor: (hex: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-3.5 py-2 border border-dashed border-[#2A3446] hover:border-[#7FA0D6] rounded-xl text-xs font-bold text-[#7FA0D6] hover:text-[#BCCCE6] flex items-center gap-1.5 cursor-pointer transition-all hover:bg-[#161F2D] active:scale-95 shadow-sm"
      >
        <Plus className="w-3.5 h-3.5" /> Add Color
      </button>

      {open && (
        <PalettePopover
          currentHex="#7FA0D6"
          title="Pick Color to Add"
          onSelect={(hex) => {
            onAddColor(hex);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
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

function generateTonePreview(
  humour: number,
  formality: number,
  respectfulness: number,
  energy: number,
  voiceWords: string[] = [],
  antiVoiceWords: string[] = []
): string {
  const words = (voiceWords || []).map((w) => w.toLowerCase().trim());
  const anti = (antiVoiceWords || []).map((w) => w.toLowerCase().trim());

  const wordMap: Record<string, { opener: string; middle: string; closer: string }> = {
    bold: {
      opener: humour > 6
        ? "We promised ourselves we wouldn't show off, but when you craft something this bold? You don't whisper."
        : formality < 4
        ? "Make no mistake: our latest breakthrough is here, built without hesitation or apology."
        : "Make no mistake: we didn't come to play small. This is pure, unapologetic impact.",
      middle: "Forged with razor-sharp conviction, raw power, and an unyielding refusal to compromise.",
      closer: energy > 6
        ? "Take your stand right now — the old rules no longer apply!"
        : "Own the outcome. Settle for nothing less.",
    },
    premium: {
      opener: formality < 4
        ? "We are privileged to present an extraordinary collection of bespoke distinction."
        : "Where masterclass artistry meets effortless luxury: welcome to something truly bespoke.",
      middle: "Meticulously finished with hand-selected materials, quiet elegance, and peerless attention to nuance.",
      closer: energy > 6
        ? "Experience world-class distinction right now — elevate your standard to the pinnacle it deserves!"
        : "An enduring testament to subtle luxury and flawless refinement.",
    },
    warm: {
      opener: humour > 6
        ? "Like catching up with an old friend who brought the best treats: we made this specially for you."
        : "Welcome to something crafted with genuine heart, open arms, and deep intention.",
      middle: "Thoughtfully created to bring comforting ease, heartfelt connection, and dependable daily delight.",
      closer: energy > 6
        ? "Come on in — let's share in something wonderful together today!"
        : "We are truly honored to share this with you. Welcome home.",
    },
    witty: {
      opener: formality < 4
        ? "We must observe, with appropriate discretion: this drop is rather scandalously clever."
        : "We tried keeping a straight face about this drop, but honestly? It's ridiculously good.",
      middle: "Clever enough to do all the heavy lifting, sharp enough to keep you grinning the whole time.",
      closer: energy > 6
        ? "Go ahead, take all the credit — your secret is safe with us!"
        : "Plot twist: it actually delivers on every single promise.",
    },
    calm: {
      opener: "A breath of tranquil clarity in an otherwise loud, chaotic world.",
      middle: "Engineered for peaceful dependability, effortless poise, and soothing, long-term harmony.",
      closer: "Breathe easy. Everything is taken care of with quiet precision.",
    },
    authoritative: {
      opener: "The definitive benchmark in modern execution, validated by industry leaders worldwide.",
      middle: "Built on rigorous empirical evidence, masterclass methodology, and zero margin for error.",
      closer: energy > 6
        ? "Command your domain with verified excellence — start leading the future now!"
        : "The definitive standard for decision-makers who accept only verified outcomes.",
    },
    playful: {
      opener: "Who said serious results can't be an absolute blast? Say hello to your newest obsession!",
      middle: "Bursting with vibrant energy, bright ideas, and delightfully unexpected smiles at every step.",
      closer: "Jump right in — let's turn the everyday grind into pure celebration!",
    },
    minimal: {
      opener: "Essential form. Zero clutter.",
      middle: "Stripped of every milligram of excess noise so only pure, unadulterated purpose remains.",
      closer: "Clean. Timeless. Effective.",
    },
    friendly: {
      opener: "Hey there! We are thrilled to share our latest creation with you.",
      middle: "Made with genuine smiles, approachable simplicity, and a helping hand ready at every turn.",
      closer: "Reach out anytime — we're always right here in your corner!",
    },
    direct: {
      opener: "Straight to the point: here is what matters and why it works.",
      middle: "We eliminated the runaround and engineered the exact high-impact outcome you need.",
      closer: "No fluff. No delays. Get straight to work.",
    },
    aspirational: {
      opener: "Designed for who you are becoming, not just where you currently stand.",
      middle: "Igniting monumental momentum and elevating your highest ambitions into tangible reality.",
      closer: "Step into tomorrow. Build the legacy you were meant for.",
    },
    technical: {
      opener: "Architected with sub-millisecond precision, robust fault tolerance, and deterministic throughput.",
      middle: "Calibrated to exceed stringent engineering specifications across all mission-critical workloads.",
      closer: "Deploy with absolute confidence and verified operational integrity.",
    },
    nurturing: {
      opener: "We meet you right where you are, with deep empathy and thoughtful care.",
      middle: "Gently designed to support, sustain, and cultivate your growth through every milestone.",
      closer: "You're never alone on this path — we're right beside you, every step of the way.",
    },
    rebellious: {
      opener: "Tear up the standard handbook. We threw it out the window.",
      middle: "Raw, unapologetic disruption built specifically for those who refuse to fit into neat little boxes.",
      closer: "Rules were meant to be broken. Welcome to the other side.",
    },
    trustworthy: {
      opener: "Founded on ironclad integrity, complete transparency, and steadfast dependability.",
      middle: "Tested without compromise, built without shortcuts, and proven to perform when it matters most.",
      closer: "Count on us to always deliver on our word — without exception.",
    },
    energetic: {
      opener: "Ignite your momentum with electrifying, high-voltage speed!",
      middle: "Powered by relentless drive and unstoppable horsepower that propels you lightyears ahead!",
      closer: "Turn the dial to eleven and feel the surge right now!",
    },
  };

  let opener = "";
  let middle = "";
  let closer = "";

  if (words.length > 0) {
    const firstWord = words[0];
    const secondWord = words[1];
    const thirdWord = words[2];
    const primary = firstWord ? wordMap[firstWord] : undefined;
    const secondary = secondWord ? wordMap[secondWord] : undefined;
    const tertiary = thirdWord ? wordMap[thirdWord] : undefined;

    if (primary) {
      opener = primary.opener;
      middle = secondary ? secondary.middle : primary.middle;
      closer = tertiary ? tertiary.closer : (secondary ? secondary.closer : primary.closer);

      // Signature multi-word blended combos
      if (words.includes("bold") && words.includes("premium")) {
        opener = "Uncompromising luxury meets fearless conviction: welcome to our finest creation yet.";
        middle = "Forged with bespoke artistry, hand-selected materials, and razor-sharp performance.";
        closer = "For those who demand the pinnacle and settle for nothing less — step into world-class distinction.";
      } else if (words.includes("warm") && words.includes("premium")) {
        opener = "Welcome to something truly rare: heartfelt hospitality met with bespoke refinement.";
        middle = "Designed with gracious care for those who appreciate quiet, enduring luxury.";
        closer = "An invitation to experience understated elegance, crafted warmly just for you.";
      } else if (words.includes("witty") && words.includes("bold")) {
        opener = "They told us not to brag. We decided not to listen. Behold our latest drop.";
        middle = "Engineered with shameless audacity, razor-sharp intellect, and pure craft.";
        closer = "Go ahead, make your competition sweat — check it out right now.";
      } else if (words.includes("minimal") && words.includes("direct")) {
        opener = "No fluff. No excuses. Pure utility.";
        middle = "Stripped of every distraction to deliver immediate, verified results.";
        closer = "Simple. Honest. Ready when you are.";
      } else if (words.includes("rebellious") && words.includes("energetic")) {
        opener = "Forget the rules and hit the gas! High-octane disruption has arrived.";
        middle = "Built to shatter the status quo with relentless speed and unapologetic power.";
        closer = "Jump in right now — the old way is officially over!";
      } else if (words.includes("warm") && words.includes("friendly")) {
        opener = "Hey! Come on in — we're so genuinely excited to show you what we've made.";
        middle = "Crafted with open arms, thoughtful details, and a welcoming smile at every turn.";
        closer = "We're always right here to help — let's build something wonderful together!";
      } else if (words.includes("calm") && words.includes("trustworthy")) {
        opener = "A quiet sanctuary of dependable craftsmanship, founded on steadfast transparency.";
        middle = "Engineered for peaceful certainty, enduring reliability, and effortless peace of mind.";
        closer = "Breathe easy knowing you're in safe, verified hands.";
      }
    }
  }

  // Base fallback if no words or words not in map
  if (!opener) {
    opener = "We are pleased to introduce our newest collection.";
    if (formality > 6 && humour > 6) {
      opener = "Okay don't panic, but our latest drop just landed and it's ridiculously good.";
    } else if (formality > 6) {
      opener = "Hey everyone! Our new release is officially live and ready for you.";
    } else if (humour > 6) {
      opener = "We promised ourselves we wouldn't hype this up, but honestly? Just look at it.";
    } else if (formality < 4 && humour < 4) {
      opener = "We are privileged to announce the immediate release of our verified collection.";
    }
  }

  if (!middle) {
    middle = "Formulated for reliable, high-standard daily performance.";
    if (energy > 7) {
      middle = "Built with relentless speed, uncompromising power, and pure craft!";
    } else if (energy < 4) {
      middle = "Quietly engineered for understated, long-term dependability.";
    }
  }

  if (!closer) {
    closer = "Available now via the link.";
    if (respectfulness > 7) {
      closer = "Rules were made to be bent. Grab yours before everyone else catches on.";
    } else if (respectfulness < 3) {
      closer = "We remain at your service and invite your esteemed feedback.";
    } else if (energy > 6) {
      closer = "Check it out right now — let's build something extraordinary together!";
    }
  }

  // Modulate punctuation and accents if energy or humour is high
  if (words.length > 0) {
    if (energy > 8 && !closer.endsWith("!")) {
      closer = closer.replace(/\.$/, "") + "!";
    }
    if (humour > 7 && !opener.startsWith("Honestly?") && !opener.startsWith("We promised")) {
      opener = "Honestly? " + opener;
    }
  }

  // Append anti-tone constraints if selected
  const antiNotes: string[] = [];
  if (anti.includes("salesy")) antiNotes.push("Zero hype, no pushy sales pitches");
  if (anti.includes("corporate")) antiNotes.push("Zero corporate jargon");
  if (anti.includes("preachy")) antiNotes.push("No unsolicited preaching");
  if (anti.includes("gimmicky")) antiNotes.push("Zero cheap gimmicks");
  if (anti.includes("desperate")) antiNotes.push("No fake urgency");
  if (anti.includes("cutesy")) antiNotes.push("No childish sugarcoating");

  let guardrailSuffix = "";
  if (antiNotes.length > 0) {
    guardrailSuffix = ` [Constraint: ${antiNotes.slice(0, 2).join("; ")}.]`;
  }

  return `"${opener} ${middle} ${closer}"${guardrailSuffix}`;
}

interface VisualPreviewData {
  headline: string;
  creativeDirective: string;
  designPillars: string[];
  executionCues: {
    typography: string;
    layout: string;
    lighting: string;
    motion: string;
  };
}

function generateVisualDirectionPreview(
  directions: string[] = [],
  _colours: Array<{ hex: string; label: string }> = [],
  font: string = ""
): VisualPreviewData {
  const selected = directions || [];

  if (selected.length === 0) {
    return {
      headline: "Awaiting Visual Direction",
      creativeDirective:
        "Select up to 3 visual styles below (e.g. Clean & Minimalist, Bold Graphic, Luxury Elegance) to synthesize how our creative directors and animators will craft your brand's visual identity.",
      designPillars: ["Flexible Grid", "Custom Color Harmony", "Adaptive Styling"],
      executionCues: {
        typography: font ? `Font: ${font}` : "Modern Balanced Sans",
        layout: "Standard Responsive Grid",
        lighting: "Neutral Commercial",
        motion: "Smooth Standard Transitions",
      },
    };
  }

  // Signature Triple & Dual Combos
  if (selected.includes("clean_minimal") && selected.includes("bold_graphic") && selected.includes("luxury_restrained")) {
    return {
      headline: "Haute Minimalism: Bold Scale, Pure Space & Luxury Restraint",
      creativeDirective:
        "A compelling synthesis of opposites: heavy, commanding typography grounded in vast Swiss negative space, punctuated by restrained luxury detailing and immaculate architectural composition.",
      designPillars: ["Expansive Negative Space", "High Contrast Typographic Anchors", "Subtle Refined Accents"],
      executionCues: {
        typography: font ? `${font} (High Contrast Weights)` : "Architectural Monospace & High-Contrast Sans",
        layout: "Rigid Asymmetric Swiss Grid with generous margins",
        lighting: "High-key directional with razor-sharp shadow falloff",
        motion: "Slow, deliberate camera tracks and precise geometric cuts",
      },
    };
  }

  if (selected.includes("clean_minimal") && selected.includes("luxury_restrained")) {
    return {
      headline: "Understated Elegance & Architectural Clarity",
      creativeDirective:
        "Bespoke minimalism where every pixel breathes. Distilled typographic elegance, quiet neutral palettes, and refined proportions that convey effortless prestige without ostentation.",
      designPillars: ["Breathable Margins", "Subtle Warm Accents", "Bespoke Kerning & Proportions"],
      executionCues: {
        typography: font || "Refined Editorial Serif & Clean Geometric Sans",
        layout: "Minimalist Gallery Grid with generous breathing room",
        lighting: "Soft diffuse studio illumination with subtle natural highlights",
        motion: "Gentle ease-in-out floats and seamless editorial dissolves",
      },
    };
  }

  if (selected.includes("bold_graphic") && selected.includes("cinematic_moody")) {
    return {
      headline: "Dramatic Noir & High-Impact Graphic Punch",
      creativeDirective:
        "Deep cinematic shadows pierced by high-contrast graphic elements and punchy typography. Atmospheric depth and raw graphic authority command full viewer attention.",
      designPillars: ["Anamorphic Shadow Depth", "Saturated Graphic Highlights", "Heavy Typographic Blocks"],
      executionCues: {
        typography: font || "Condensed Heavyweight Grotesk",
        layout: "Full-bleed widescreen frames with overlapping graphic overlays",
        lighting: "Moody low-key with focused rim lighting and rich blacks",
        motion: "Dynamic kinetic speed ramps with deep parallax depth",
      },
    };
  }

  if (selected.includes("bright_playful") && selected.includes("bold_graphic")) {
    return {
      headline: "High-Voltage Graphic Pop & Vibrant Energy",
      creativeDirective:
        "Electrifying visual rhythm bursting with bold typographic scales, saturated color clashes, and buoyant kinetic micro-animations engineered to immediately stop thumbs on social feeds.",
      designPillars: ["Punchy Contrast Ratios", "Elastic Kinetic Curves", "Vibrant Accent Pops"],
      executionCues: {
        typography: font || "Expressive Rounded Sans & Bold Display Weights",
        layout: "Dynamic modular collage with unexpected sticker badges",
        lighting: "Vibrant high-key daylight with saturated bounce",
        motion: "Spring-physics pops, snappy zooms, and energetic cuts",
      },
    };
  }

  if (selected.includes("warm_editorial") && selected.includes("documentary_raw")) {
    return {
      headline: "Authentic Human Warmth & Candid Documentary Soul",
      creativeDirective:
        "Unvarnished, candid storytelling illuminated by golden-hour sunlight and analog texture. Intimate close-ups, genuine interactions, and honest behind-the-scenes presence.",
      designPillars: ["Analog Film Grain", "Natural Golden Ambient Light", "Unstaged Human Moments"],
      executionCues: {
        typography: font || "Humanist Sans & Warm Vintage Serif",
        layout: "Organic scrapbook & editorial journal layouts",
        lighting: "Warm golden-hour daylight with natural lens flares",
        motion: "Handheld camera drift with organic natural pacing",
      },
    };
  }

  if (selected.includes("cinematic_moody") && selected.includes("luxury_restrained")) {
    return {
      headline: "Atmospheric Luxury & Filmic Distinction",
      creativeDirective:
        "Velvety blacks, cinematic depth-of-field, and bespoke typographic detailing. Evoking the world of high-end cinema and luxury fashion editorial campaigns.",
      designPillars: ["Chiaroscuro Contrast", "Filmic 2.39:1 Framing", "Bespoke Quiet Opulence"],
      executionCues: {
        typography: font || "High-End Modern Editorial Serif",
        layout: "Cinematic letterbox framing with restrained typography",
        lighting: "Volumetric mood lighting with soft highlights",
        motion: "Slow, sweeping gimbal glides and lingering hero holds",
      },
    };
  }

  const traitMap: Record<string, { label: string; text: string; cue: string }> = {
    clean_minimal: {
      label: "Minimalist Space",
      text: "generous negative space and disciplined Swiss grid alignment",
      cue: "uncluttered clean layouts",
    },
    bold_graphic: {
      label: "Bold Graphics",
      text: "heavy kinetic typography and razor-sharp contrast anchors",
      cue: "punchy visual hierarchy",
    },
    warm_editorial: {
      label: "Warm Editorial",
      text: "golden-hour warmth, analog filmic textures, and candid intimacy",
      cue: "editorial photojournalism",
    },
    cinematic_moody: {
      label: "Cinematic Mood",
      text: "atmospheric low-key shadows and rich widescreen color grading",
      cue: "dramatic film lighting",
    },
    bright_playful: {
      label: "Playful Pop",
      text: "vibrant saturated color pops and buoyant elastic motion curves",
      cue: "energetic lively motion",
    },
    luxury_restrained: {
      label: "Restrained Luxury",
      text: "bespoke understated proportions and quiet luxury craftsmanship",
      cue: "subtle prestige detailing",
    },
    documentary_raw: {
      label: "Raw Authenticity",
      text: "handheld kinetic honesty, natural available lighting, and unfiltered reality",
      cue: "honest candid capture",
    },
    retro_nostalgic: {
      label: "Retro Nostalgia",
      text: "subtle vintage halation, 35mm grain emulation, and mid-century warmth",
      cue: "analog retro warmth",
    },
  };

  const activeTraits = selected
    .map((s) => traitMap[s])
    .filter((t): t is { label: string; text: string; cue: string } => Boolean(t));
  const titleWords = activeTraits.map((t) => t.label).join(" × ");
  const textSummary = activeTraits.map((t) => t.text).join(", balanced with ");
  const cues = activeTraits.map((t) => t.cue).join(" · ");

  return {
    headline: titleWords,
    creativeDirective: `Crafted around ${textSummary}. Engineered to give your brand an unmistakable visual identity that cuts through feed noise.`,
    designPillars: activeTraits.map((t) => t.label),
    executionCues: {
      typography: font ? `Primary Font: ${font}` : "Curated Custom Typography",
      layout: cues,
      lighting: selected.includes("cinematic_moody") ? "Low-key Dramatic" : "Polished High-standard",
      motion: selected.includes("bright_playful") ? "Dynamic & Spring-based" : "Smooth & Measured",
    },
  };
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
      Number(secC.humour ?? 5),
      Number(secC.formality ?? 5),
      Number(secC.respectfulness ?? 5),
      Number(secC.energy ?? 5),
      secC.voice_words || [],
      secC.anti_voice_words || []
    );
  }, [
    secC.humour,
    secC.formality,
    secC.respectfulness,
    secC.energy,
    secC.voice_words,
    secC.anti_voice_words,
  ]);

  // Visual direction preview calculation
  const visualPreview = useMemo(() => {
    return generateVisualDirectionPreview(
      secD.visual_direction || [],
      secD.colours || [],
      secD.fonts || ""
    );
  }, [secD.visual_direction, secD.colours, secD.fonts]);

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
            <div className="bg-[#0B111C] text-white rounded-xl p-4.5 border border-[#2A3446] shadow-xl relative overflow-hidden transition-all duration-300 hover:border-[#7FA0D6]/50">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono mb-2.5">
                <div className="flex items-center gap-2 text-[#7FA0D6] uppercase tracking-wider font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7FA0D6] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7FA0D6]"></span>
                  </span>
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Live Voice Synthesizer Preview</span>
                </div>

                {/* Active Blend indicators */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(secC.voice_words || []).map((w: string) => (
                    <span
                      key={w}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/40 uppercase tracking-wider shadow-[0_0_8px_rgba(127,160,214,0.2)]"
                    >
                      ✦ {w}
                    </span>
                  ))}
                  {(secC.anti_voice_words || []).map((w: string) => (
                    <span
                      key={w}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/50 text-rose-300 border border-rose-800/50 uppercase tracking-wider"
                    >
                      🛡️ no {w}
                    </span>
                  ))}
                  {(!secC.voice_words || secC.voice_words.length === 0) && (
                    <span className="text-[10px] text-[#97A0B3] italic">
                      Pick voice words below to dynamically synthesize tone
                    </span>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={liveSentencePreview}
                  initial={{ opacity: 0, y: 5, scale: 0.99, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -4, scale: 0.99, filter: "blur(2px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-sm sm:text-base font-medium italic text-[#E2E8F0] leading-relaxed"
                >
                  {liveSentencePreview}
                </motion.p>
              </AnimatePresence>
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer transform active:scale-95 hover:scale-[1.02] ${
                        isSelected
                          ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6] shadow-[0_0_12px_rgba(127,160,214,0.45)] ring-1 ring-[#7FA0D6]"
                          : "bg-[#0B111C] text-[#BCCCE6] border-[#2A3446] hover:border-[#7FA0D6]/60 hover:text-white"
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer transform active:scale-95 hover:scale-[1.02] ${
                        isSelected
                          ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.4)] ring-1 ring-rose-400"
                          : "bg-[#161F2D] text-rose-200 border-rose-900/50 hover:border-rose-700 hover:text-rose-100"
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
                <AddColorPaletteButton
                  onAddColor={(newHex) => {
                    setSecD({
                      ...secD,
                      colours: [...(secD.colours || []), { hex: newHex, label: "accent" }],
                    });
                    clearFieldError("colours");
                  }}
                />
              </div>
              {fieldErrors.colours && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3.5 shrink-0" /> {fieldErrors.colours}
                </p>
              )}
            </div>

            {/* D6: Visual Direction */}
            <div id="field-visual_direction" className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#F1F5F9]">
                  D6: Visual Direction (Pick up to 3) <span className="text-rose-400 font-bold">*</span>
                </label>
                <span className="text-xs text-[#97A0B3] font-mono">
                  {secD.visual_direction?.length || 0}/3 selected
                </span>
              </div>

              {/* LIVE VISUAL DIRECTION SYNTHESIZER PREVIEW BOX */}
              <div className="bg-[#0B111C] rounded-2xl p-4.5 border border-[#2A3446] shadow-xl relative overflow-hidden transition-all duration-300 hover:border-[#7FA0D6]/50">
                {/* Ambient glow from user's primary brand color */}
                <div
                  className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500"
                  style={{ backgroundColor: secD.colours?.[0]?.hex || "#7FA0D6" }}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono mb-2.5">
                  <div className="flex items-center gap-2 text-[#7FA0D6] uppercase tracking-wider font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7FA0D6] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7FA0D6]"></span>
                    </span>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Live Visual Direction & Style Preview</span>
                  </div>

                  {/* Active Visual Direction Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(secD.visual_direction || []).map((vVal: string) => {
                      const opt = VISUAL_DIRECTION_OPTIONS.find((o) => o.value === vVal);
                      return (
                        <span
                          key={vVal}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/40 uppercase tracking-wider shadow-[0_0_8px_rgba(127,160,214,0.2)]"
                        >
                          ✦ {opt?.label || vVal}
                        </span>
                      );
                    })}
                    {(!secD.visual_direction || secD.visual_direction.length === 0) && (
                      <span className="text-[10px] text-[#97A0B3] italic">
                        Select styles below to synthesize art direction
                      </span>
                    )}
                  </div>
                </div>

                {/* Animated Creative Directive Text */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={(secD.visual_direction || []).join("-") + (secD.fonts || "") + (secD.colours || []).map((c) => c.hex).join("-")}
                    initial={{ opacity: 0, y: 5, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="space-y-3"
                  >
                    <div className="border-l-2 border-[#7FA0D6] pl-3 py-0.5">
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {visualPreview.headline}
                      </h4>
                      <p className="text-xs text-[#BCCCE6] mt-1 leading-relaxed italic">
                        "{visualPreview.creativeDirective}"
                      </p>
                    </div>

                    {/* Miniature Live Creative Canvas / Mockup Banner */}
                    <div className="p-3 rounded-xl border border-[#2A3446] bg-[#161F2D]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#97A0B3]">Brand Harmony:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {secD.colours?.map((c, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0B111C] border border-white/10 text-[10px] font-mono text-white"
                              >
                                <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                                <span>{c.hex}</span>
                                <span className="text-[9px] text-[#97A0B3] lowercase">({c.label})</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {secD.fonts && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#97A0B3] font-mono">
                            <span>Primary Font:</span>
                            <span className="text-[#7FA0D6] font-semibold">{secD.fonts}</span>
                          </div>
                        )}
                      </div>

                      {/* Execution tags */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {visualPreview.designPillars.map((pillar, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#0B111C] text-[#BCCCE6] border border-[#2A3446]"
                          >
                            {pillar}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* D6 Buttons */}
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
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer transform active:scale-95 hover:scale-[1.02] ${
                        isSelected
                          ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6] shadow-[0_0_12px_rgba(127,160,214,0.45)] ring-1 ring-[#7FA0D6]"
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
