import { useState, useRef } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { request } from "../../lib/http";
import { MobileNavBar } from "./MobileNavBar";
import { MobileFooter } from "./MobileFooter";

type CategoryKey = "reels" | "carousels" | "stories" | "ads";
type PlanKey = "starter" | "accelerator" | "scale";

interface CategoryData {
  t0: string;
  t1: string;
  t2: string;
  b0: string;
  b1: string;
  b2: string;
  img0: string;
  img1: string;
  img2: string;
}

const CATEGORY_MEDIA: Record<CategoryKey, CategoryData> = {
  reels: {
    t0: "Hardstyle Gym Drop",
    t1: "Artisan Sourdough",
    t2: "Botanical Serum",
    b0: "0:15 Cut • Color Graded",
    b1: "Figma Master Deck",
    b2: "Launch Countdown",
    img0: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3Xe8hA6Kva3hHWL6jEW4O92CNepe_4HynKnYiYE_KW0UhjDq_0G6cZ-om2yKl666rRuEjHapoPlyyT-QrY_O1FdyQBTQCW8Kl-NPOWZpfN_orFdnMgZf7NhDWEKceitSnH-iSV1Hu8RHsrZxOZ2yY53To7-TcbpsvAfthtOwOpLQVzo8BIsgi7A8cejWB7C0tWypeptqYK09bZTX8zrMLFbcBr4uizik9Wge9ukQyt9SqhzLHU0uM",
    img1: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdEWZVWLbNOpcjLYJt3vCFLipBzRxY3b7DIlxz_1f0mBAQXCBiUUfjNNYUI-SLAYCoBxoVL2VD9ljbrb_Q_uzCCvcPhp6XFSDnhezoL3UFG_D4M5Rq-GCVAHEITRpfTfxeo2z2iEr1mSUyM-UMx53O0xLXEq02QfsaqDMQ1j7eJdo_X17afJ2Zd3m2ZHCkp_qUK3IavtylWW2dsKRPTKPb7IIkNRX-yd6EthGoVIMEQP5Xhb8cxteH",
    img2: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhkpc441iMjj2q7pMTIDKXB0dUvUgIDA26cJ2adpONAsR7uwEvcdwu054io8Ci5ZbNQAJtG21PuG5hOsX-n3Bdvt3IX4jjIRg7dZPDw0auv6hi0LJJ0Sa2QW2398Pb5vF8eWLu4OyNM-lQf4MgCsIoUOnwkhkUhv8XvCO-YMLUotdCLCV9bfQFR8JuKLTrl4_7nz0_66rWukOLUOvHw3Ve8T8-sNL85Ubyjq0o8JpZmWuq0BTRfayY",
  },
  carousels: {
    t0: "4-Slide Feature Teardown",
    t1: "Ingredient Deep-Dive",
    t2: "Packaging Anatomy",
    b0: "Swipe Blueprint • High Ret.",
    b1: "Figma Master File",
    b2: "Conversion Visuals",
    img0: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdEWZVWLbNOpcjLYJt3vCFLipBzRxY3b7DIlxz_1f0mBAQXCBiUUfjNNYUI-SLAYCoBxoVL2VD9ljbrb_Q_uzCCvcPhp6XFSDnhezoL3UFG_D4M5Rq-GCVAHEITRpfTfxeo2z2iEr1mSUyM-UMx53O0xLXEq02QfsaqDMQ1j7eJdo_X17afJ2Zd3m2ZHCkp_qUK3IavtylWW2dsKRPTKPb7IIkNRX-yd6EthGoVIMEQP5Xhb8cxteH",
    img1: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3Xe8hA6Kva3hHWL6jEW4O92CNepe_4HynKnYiYE_KW0UhjDq_0G6cZ-om2yKl666rRuEjHapoPlyyT-QrY_O1FdyQBTQCW8Kl-NPOWZpfN_orFdnMgZf7NhDWEKceitSnH-iSV1Hu8RHsrZxOZ2yY53To7-TcbpsvAfthtOwOpLQVzo8BIsgi7A8cejWB7C0tWypeptqYK09bZTX8zrMLFbcBr4uizik9Wge9ukQyt9SqhzLHU0uM",
    img2: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhkpc441iMjj2q7pMTIDKXB0dUvUgIDA26cJ2adpONAsR7uwEvcdwu054io8Ci5ZbNQAJtG21PuG5hOsX-n3Bdvt3IX4jjIRg7dZPDw0auv6hi0LJJ0Sa2QW2398Pb5vF8eWLu4OyNM-lQf4MgCsIoUOnwkhkUhv8XvCO-YMLUotdCLCV9bfQFR8JuKLTrl4_7nz0_66rWukOLUOvHw3Ve8T8-sNL85Ubyjq0o8JpZmWuq0BTRfayY",
  },
  stories: {
    t0: "Serum Launch Countdown",
    t1: "Flash Sale 24h",
    t2: "Behind The Scenes Drop",
    b0: "3 Animated Drops",
    b1: "Limited Timer Sticker",
    b2: "Founder Raw Cam",
    img0: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhkpc441iMjj2q7pMTIDKXB0dUvUgIDA26cJ2adpONAsR7uwEvcdwu054io8Ci5ZbNQAJtG21PuG5hOsX-n3Bdvt3IX4jjIRg7dZPDw0auv6hi0LJJ0Sa2QW2398Pb5vF8eWLu4OyNM-lQf4MgCsIoUOnwkhkUhv8XvCO-YMLUotdCLCV9bfQFR8JuKLTrl4_7nz0_66rWukOLUOvHw3Ve8T8-sNL85Ubyjq0o8JpZmWuq0BTRfayY",
    img1: "https://lh3.googleusercontent.com/aida-public/AB6AXuCECfYeE9VoKOeuzDqr-PsfgkZpXpw_yxm51Y0wbsXKXkemtIhDNrPHVz5HqAT0zahUJ_mwjP9hpzKvFyyUxLXTZYcJMg8-TXFqBybctXc5O4JgPVpkFmIR9IS_zaphfFIJOnjyGgqnO_vYIvFO2voifgmi9s5AXB6iTZ2spt9BnYxS_iWlfUjB9tOC0j7il7YgVOIU8WwX_82HfEvFA0ig4QbMDOO4uFWdsCOFQ5L1I7F9kKQaitBB",
    img2: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3Xe8hA6Kva3hHWL6jEW4O92CNepe_4HynKnYiYE_KW0UhjDq_0G6cZ-om2yKl666rRuEjHapoPlyyT-QrY_O1FdyQBTQCW8Kl-NPOWZpfN_orFdnMgZf7NhDWEKceitSnH-iSV1Hu8RHsrZxOZ2yY53To7-TcbpsvAfthtOwOpLQVzo8BIsgi7A8cejWB7C0tWypeptqYK09bZTX8zrMLFbcBr4uizik9Wge9ukQyt9SqhzLHU0uM",
  },
  ads: {
    t0: "Meta UGC Direct Response",
    t1: "TikTok Hook Variant B",
    t2: "YouTube Short 4K",
    b0: "Hook Tested • Subtitles",
    b1: "Pacing 1.25x • Trend Audio",
    b2: "Master Render 60fps",
    img0: "https://lh3.googleusercontent.com/aida-public/AB6AXuCECfYeE9VoKOeuzDqr-PsfgkZpXpw_yxm51Y0wbsXKXkemtIhDNrPHVz5HqAT0zahUJ_mwjP9hpzKvFyyUxLXTZYcJMg8-TXFqBybctXc5O4JgPVpkFmIR9IS_zaphfFIJOnjyGgqnO_vYIvFO2voifgmi9s5AXB6iTZ2spt9BnYxS_iWlfUjB9tOC0j7il7YgVOIU8WwX_82HfEvFA0ig4QbMDOO4uFWdsCOFQ5L1I7F9kKQaitBB",
    img1: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3Xe8hA6Kva3hHWL6jEW4O92CNepe_4HynKnYiYE_KW0UhjDq_0G6cZ-om2yKl666rRuEjHapoPlyyT-QrY_O1FdyQBTQCW8Kl-NPOWZpfN_orFdnMgZf7NhDWEKceitSnH-iSV1Hu8RHsrZxOZ2yY53To7-TcbpsvAfthtOwOpLQVzo8BIsgi7A8cejWB7C0tWypeptqYK09bZTX8zrMLFbcBr4uizik9Wge9ukQyt9SqhzLHU0uM",
    img2: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdEWZVWLbNOpcjLYJt3vCFLipBzRxY3b7DIlxz_1f0mBAQXCBiUUfjNNYUI-SLAYCoBxoVL2VD9ljbrb_Q_uzCCvcPhp6XFSDnhezoL3UFG_D4M5Rq-GCVAHEITRpfTfxeo2z2iEr1mSUyM-UMx53O0xLXEq02QfsaqDMQ1j7eJdo_X17afJ2Zd3m2ZHCkp_qUK3IavtylWW2dsKRPTKPb7IIkNRX-yd6EthGoVIMEQP5Xhb8cxteH",
  },
};

const STEP_DATA: Record<number, { title: string; desc: string; tag: string }> = {
  1: {
    title: "Step 01 // Day 1: Brand DNA Ingestion",
    desc: "Upload raw assets, fonts, and guardrails. Dedicated pod is mapped and initialized in 24 hours.",
    tag: "24h SLA",
  },
  2: {
    title: "Step 02 // Days 2-3: Blueprint & Strategy",
    desc: "Retention hooks, angle matrix, and modular shot lists developed specifically for your conversion goal.",
    tag: "Angles Mapped",
  },
  3: {
    title: "Step 03 // Days 4-5: Post Production & 4K Polish",
    desc: "Sound design, motion color grading, dynamic subtitles and multi-aspect ratio rendering.",
    tag: "Senior Editors",
  },
  4: {
    title: "Step 04 // Day 7: Batch Delivery",
    desc: "One-tap approval portal link lands with timestamped revision note capability.",
    tag: "Instant 4K Dl",
  },
  5: {
    title: "Step 05 // Weekly: Publish, Learn & Iterate",
    desc: "Creative performance telemetry directly feeds subsequent sprint batches for compounding ROAS.",
    tag: "Weekly Autopilot",
  },
};

interface PortalBatch {
  title: string;
  meta: string;
  status: string;
  img: string;
}

const DEFAULT_BATCH: PortalBatch = {
  title: "Brand Launch Teaser",
  meta: "Audio Synced • 4K Master • 15 & 30s Cuts",
  status: "✓ Ready for Review",
  img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCECfYeE9VoKOeuzDqr-PsfgkZpXpw_yxm51Y0wbsXKXkemtIhDNrPHVz5HqAT0zahUJ_mwjP9hpzKvFyyUxLXTZYcJMg8-TXFqBybctXc5O4JgPVpkFmIR9IS_zaphfFIJOnjyGgqnO_vYIvFO2voifgmi9s5AXB6iTZ2spt9BnYxS_iWlfUjB9tOC0j7il7YgVOIU8WwX_82HfEvFA0ig4QbMDOO4uFWdsCOFQ5L1I7F9kKQaitBB",
};

const PORTAL_BATCHES: Record<number, PortalBatch> = {
  4: DEFAULT_BATCH,
  3: {
    title: "Artisan Bread Product Breakdown",
    meta: "4 Carousel Frames • Figma Master Deck",
    status: "Approved +2 days early",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdEWZVWLbNOpcjLYJt3vCFLipBzRxY3b7DIlxz_1f0mBAQXCBiUUfjNNYUI-SLAYCoBxoVL2VD9ljbrb_Q_uzCCvcPhp6XFSDnhezoL3UFG_D4M5Rq-GCVAHEITRpfTfxeo2z2iEr1mSUyM-UMx53O0xLXEq02QfsaqDMQ1j7eJdo_X17afJ2Zd3m2ZHCkp_qUK3IavtylWW2dsKRPTKPb7IIkNRX-yd6EthGoVIMEQP5Xhb8cxteH",
  },
  2: {
    title: "Serum Launch Countdown",
    meta: "3 Dynamic Stories • High CTR Hook Layouts",
    status: "Delivered & Live",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhkpc441iMjj2q7pMTIDKXB0dUvUgIDA26cJ2adpONAsR7uwEvcdwu054io8Ci5ZbNQAJtG21PuG5hOsX-n3Bdvt3IX4jjIRg7dZPDw0auv6hi0LJJ0Sa2QW2398Pb5vF8eWLu4OyNM-lQf4MgCsIoUOnwkhkUhv8XvCO-YMLUotdCLCV9bfQFR8JuKLTrl4_7nz0_66rWukOLUOvHw3Ve8T8-sNL85Ubyjq0o8JpZmWuq0BTRfayY",
  },
};

interface PortalItem {
  id: number;
  label: string;
  typeTag: string;
}

const PORTAL_ITEMS: PortalItem[] = [
  { id: 4, label: "Reel 9:16", typeTag: "REEL • 9:16" },
  { id: 3, label: "Carousel", typeTag: "CAROUSEL • 4:5" },
  { id: 2, label: "Story Set", typeTag: "STORY • 9:16" },
];

const PRICING_PLANS: Record<
  PlanKey,
  {
    badge: string;
    title: string;
    cost: string;
    reels: number;
    posters: number;
    stories: number;
    features: string[];
    cta: string;
    planParam: string;
  }
> = {
  starter: {
    badge: "TEST DRIVE",
    title: "Starter Growth",
    cost: "₹25,000",
    reels: 4,
    posters: 8,
    stories: 10,
    features: [
      "1 revision round",
      "Brand tone setup",
      "4 High-impact reels",
      "Private portal sync",
    ],
    cta: "Choose Starter Growth →",
    planParam: "Starter",
  },
  accelerator: {
    badge: "POPULAR",
    title: "Brand Accelerator",
    cost: "₹50,000",
    reels: 8,
    posters: 15,
    stories: 30,
    features: [
      "2 revision rounds",
      "Dedicated CD & copy",
      "Cinematic 9:16 audio",
      "Private Slack sync",
    ],
    cta: "Choose Brand Accelerator →",
    planParam: "Growth",
  },
  scale: {
    badge: "MAX VELOCITY",
    title: "Scale Pod",
    cost: "₹1,00,000",
    reels: 16,
    posters: 30,
    stories: 40,
    features: [
      "3 revisions + on-demand",
      "Dedicated VFX Lead",
      "16 High-production 4K",
      "24h Priority Turnaround",
    ],
    cta: "Deploy Scale Pod →",
    planParam: "Scale",
  },
};

export function MobileLandingPage() {
  // 1. 3D Card Stack
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("reels");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [activeCardBounce, setActiveCardBounce] = useState(false);
  const [soundActive, setSoundActive] = useState(true);

  // 2. Stepper
  const [activeStep, setActiveStep] = useState(1);
  const [stepFading, setStepFading] = useState(false);

  // 3. Deliverables Portal
  const [activeBatch, setActiveBatch] = useState<number>(4);
  const [approvedBatches, setApprovedBatches] = useState<Record<number, boolean>>({});
  const [changesRequested, setChangesRequested] = useState(false);

  // 4. Pricing
  const [activePlan, setActivePlan] = useState<PlanKey>("accelerator");

  // 5. FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 6. Lead Capture Form
  const [sampleHandle, setSampleHandle] = useState("");
  const [sampleEmail, setSampleEmail] = useState("");
  const [sampleSubmitting, setSampleSubmitting] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleNextCard = () => {
    setActiveCardIndex((prev) => (prev + 1) % 3);
  };

  const handleCardClick = (idx: number) => {
    if (idx === activeCardIndex) {
      setActiveCardBounce(true);
      setTimeout(() => setActiveCardBounce(false), 200);
    } else {
      setActiveCardIndex(idx);
    }
  };

  const handleCategorySelect = (cat: CategoryKey) => {
    setActiveCategory(cat);
    setActiveCardIndex(0);
  };

  const handleStepSelect = (step: number) => {
    setStepFading(true);
    setTimeout(() => {
      setActiveStep(step);
      setStepFading(false);
    }, 120);
  };

  const handleToggleApprove = () => {
    setApprovedBatches((prev) => ({
      ...prev,
      [activeBatch]: !prev[activeBatch],
    }));
  };

  const handleRequestChanges = () => {
    setChangesRequested(true);
    setTimeout(() => setChangesRequested(false), 2200);
  };

  const handleSampleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleEmail || !sampleEmail.includes("@")) {
      setSampleError("Please enter a valid work email address.");
      return;
    }
    if (!sampleHandle.trim()) {
      setSampleError("Please enter your Instagram handle.");
      return;
    }

    setSampleSubmitting(true);
    setSampleError(null);

    try {
      await request("/api/v1/public/sample", {
        method: "POST",
        body: JSON.stringify({
          email: sampleEmail.trim(),
          instagram_handle: sampleHandle.trim(),
        }),
      });
      setSampleSuccess(true);
    } catch (err: unknown) {
      setSampleError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSampleSubmitting(false);
    }
  };

  const currentMedia = CATEGORY_MEDIA[activeCategory];
  const isCurrentBatchApproved = !!approvedBatches[activeBatch];
  const currentBatchData: PortalBatch = PORTAL_BATCHES[activeBatch] ?? DEFAULT_BATCH;
  const currentPlan = PRICING_PLANS[activePlan];

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[430px] mx-auto min-h-screen bg-[#0B111C] border-x border-[#2A3446] flex flex-col shadow-[0_0_90px_rgba(0,0,0,0.95)] overflow-x-hidden font-plus-jakarta text-[#F8FAFC] antialiased selection:bg-[#7FA0D6]/30 selection:text-[#BCCCE6]"
    >
      {/* Ambient Subtle Glows */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#7FA0D6]/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-[680px] -right-20 w-64 h-64 bg-[#7FA0D6]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-[1380px] -left-20 w-64 h-64 bg-[#7FA0D6]/10 rounded-full blur-[80px] pointer-events-none" />

      {/* 1. HEADER (with menu bar: home, work, pricing, about, login, get started) */}
      <MobileNavBar
        statusBadge="Studio Live"
        statusType="cyan"
        ctaText="Book Call"
        onCtaClick={() => scrollToSection("lead-capture")}
      />

      <main className="flex-1 flex flex-col gap-5 px-3 pt-3.5 pb-6">
        {/* 2. HERO SECTION */}
        <section className="flex flex-col items-start gap-2.5 relative" data-purpose="hero-overview">
          {/* Micro Category Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161F2D] border border-[#2A3446] backdrop-blur-md">
            <span className="text-xs text-[#D8BF9B] leading-none">⚡</span>
            <span className="text-[9px] font-bold tracking-wider text-[#7FA0D6] uppercase">
              CREATIVE PRODUCTION FOR D2C
            </span>
          </div>

          {/* Punchy Headline */}
          <h1 className="text-[27px] leading-[1.08] font-extrabold tracking-tight text-[#F8FAFC]">
            Content that ships every week.
            <br />
            <span className="text-[#7FA0D6] border-b-2 border-[#7FA0D6]/40 pb-0.5">
              Proof you can check.
            </span>
          </h1>

          {/* Crisp Mobile Subheadline */}
          <p className="text-[12px] leading-[1.45] text-[#97A0B3] font-normal">
            A dedicated creative pod shipping weekly reels, carousels, and ads directly to your private one-tap portal.
          </p>

          {/* Dual Action Buttons (Side by Side: Left to Right) */}
          <div className="w-full flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => scrollToSection("lead-capture")}
              className="flex-1 h-10 px-3.5 rounded-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-[11.5px] whitespace-nowrap flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(188,204,230,0.2)] active:scale-95 transition-all cursor-pointer"
            >
              <span>Get a free sample batch</span>
              <span className="text-xs font-bold leading-none">→</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("deliverables-portal")}
              className="h-10 px-3.5 rounded-full bg-[#161F2D] hover:bg-[#2A3446]/40 border border-[#2A3446] text-[#BCCCE6] hover:text-white text-[11.5px] font-semibold whitespace-nowrap flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <span>Explore portal</span>
              <span className="text-xs text-[#7FA0D6] font-bold leading-none">↗</span>
            </button>
          </div>

          {/* Micro Guarantee Strip */}
          <div className="w-full pt-1.5 pb-1 flex items-center justify-between text-[10px] font-medium text-[#97A0B3] border-t border-b border-[#2A3446] px-1">
            <span className="flex items-center gap-1.5">
              <span className="text-[#7FA0D6]">●</span> Month-to-month
            </span>
            <span className="text-[#2A3446]">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#7FA0D6]">●</span> 7-day first batch
            </span>
            <span className="text-[#2A3446]">|</span>
            <span className="flex items-center gap-1.5 text-[#F8FAFC]">
              Late? Credited
            </span>
          </div>

          {/* Seamless Logo Ticker */}
          <div className="w-full relative overflow-hidden py-1">
            <div className="absolute left-0 inset-y-0 w-8 bg-gradient-to-r from-[#0B111C] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-[#0B111C] to-transparent z-10 pointer-events-none" />
            <div className="animate-mobile-marquee whitespace-nowrap text-[10.5px] font-space-grotesk tracking-widest uppercase text-[#97A0B3]/70 gap-6 flex">
              <span>LINEAR</span><span>•</span><span>SNITCH</span><span>•</span><span>FEASTABLES</span><span>•</span><span>KITH</span><span>•</span><span>GYMSHARK</span><span>•</span><span>NOTION</span><span>•</span>
              <span>LINEAR</span><span>•</span><span>SNITCH</span><span>•</span><span>FEASTABLES</span><span>•</span><span>KITH</span><span>•</span><span>GYMSHARK</span><span>•</span><span>NOTION</span><span>•</span>
            </div>
          </div>
        </section>

        {/* 3. HERO SHOWCASE: INTERACTIVE 3D FLUID CARD STACK */}
        <section className="flex flex-col gap-2" data-purpose="fluid-3d-stack">
          {/* Category Pill Toggle */}
          <div className="flex items-center justify-between gap-1 p-1 rounded-full bg-[#050810] border border-[#2A3446] text-[10px] font-semibold">
            {(["reels", "carousels", "stories", "ads"] as CategoryKey[]).map((cat) => {
              const labels: Record<CategoryKey, string> = {
                reels: "Reels 9:16",
                carousels: "Carousels",
                stories: "Stories",
                ads: "Paid Ads",
              };
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`flex-1 py-1 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#161F2D] text-[#7FA0D6] border border-[#7FA0D6]/40 shadow-sm font-bold"
                      : "text-[#97A0B3] hover:text-[#F8FAFC]"
                  }`}
                >
                  {labels[cat]}
                </button>
              );
            })}
          </div>

          {/* 3D Card Stack Viewport */}
          <div className="perspective-container relative w-full h-[330px] flex items-center justify-center overflow-hidden py-1">
            {/* Stack Controls Header */}
            <div className="absolute top-1 left-2 z-30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6]" />
              <span className="text-[9px] font-space-grotesk tracking-wider text-[#97A0B3] uppercase">
                Card {activeCardIndex + 1} / 3
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextCard}
              className="absolute top-1 right-2 z-30 inline-flex items-center gap-1 text-[10px] font-space-grotesk font-bold text-[#7FA0D6] hover:text-[#BCCCE6] transition-colors cursor-pointer"
            >
              <span>Next Creative ➔</span>
            </button>

            {/* The 3 Layered Smartphone Deck Cards */}
            {[0, 1, 2].map((i) => {
              const offset = (i - activeCardIndex + 3) % 3;
              let transform = "";
              let zIndex = 5;
              let opacity = 0.45;

              if (offset === 0) {
                transform = "translate3d(0, 0, 40px) scale(1) rotate(0deg)";
                zIndex = 20;
                opacity = 1;
              } else if (offset === 1) {
                transform = "translate3d(42px, 8px, -20px) scale(0.92) rotate(6deg)";
                zIndex = 10;
                opacity = 0.65;
              } else {
                transform = "translate3d(-42px, 8px, -40px) scale(0.86) rotate(-6deg)";
                zIndex = 5;
                opacity = 0.45;
              }

              const isFront = offset === 0;
              const cardTitle = i === 0 ? currentMedia.t0 : i === 1 ? currentMedia.t1 : currentMedia.t2;
              const cardSub = i === 0 ? currentMedia.b0 : i === 1 ? currentMedia.b1 : currentMedia.b2;
              const cardImg = i === 0 ? currentMedia.img0 : i === 1 ? currentMedia.img1 : currentMedia.img2;

              return (
                <div
                  key={i}
                  onClick={() => handleCardClick(i)}
                  style={{ transform, zIndex, opacity }}
                  className={`stack-card absolute w-[215px] h-[310px] rounded-[24px] p-1.5 bg-[#161F2D] border border-[#2A3446] shadow-xl backdrop-blur-md cursor-pointer select-none transition-all duration-300 ${
                    isFront && activeCardBounce ? "scale-[0.97]" : ""
                  }`}
                >
                  <div className="relative w-full h-full rounded-[19px] overflow-hidden bg-[#050810] border border-[#2A3446]">
                    <img
                      src={cardImg}
                      alt={cardTitle}
                      className={`w-full h-full object-cover ${isFront ? "brightness-[0.92]" : "brightness-[0.85]"}`}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

                    {/* Badges */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#050810]/85 backdrop-blur-md border border-[#2A3446] text-[#F8FAFC]">
                        {i === 0 ? "Reel • 9:16" : i === 1 ? "Carousel • 4 Slides" : "Story • 3 Frames"}
                      </span>
                      <span
                        className={`text-[8.5px] font-space-grotesk px-2 py-0.5 rounded font-semibold ${
                          i === 0
                            ? "bg-[#161F2D] border border-[#7FA0D6]/40 text-[#7FA0D6]"
                            : i === 1
                            ? "bg-[#050810]/80 border border-[#2A3446] text-[#97A0B3]"
                            : "bg-[#161F2D] border border-[#7FA0D6]/40 text-[#7FA0D6]"
                        }`}
                      >
                        {i === 0 ? "Retention: 92.4%" : i === 1 ? "CTR: 4.8%" : "Ready"}
                      </span>
                    </div>

                    {/* Primary Play Trigger */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center pl-0.5 transition-transform ${
                          isFront
                            ? "bg-[#BCCCE6] text-[#050810] shadow-[0_4px_16px_rgba(188,204,230,0.3)] active:scale-90"
                            : "bg-[#161F2D]/80 border border-[#2A3446] backdrop-blur-md text-[#F8FAFC]"
                        }`}
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Bottom Meta Strip */}
                    <div className="absolute bottom-2 inset-x-2 flex items-end justify-between">
                      <div>
                        <h4 className="text-[11px] font-bold text-[#F8FAFC] leading-tight">{cardTitle}</h4>
                        <p className="text-[9px] text-[#97A0B3] font-space-grotesk">{cardSub}</p>
                      </div>

                      {/* Sound Toggle Indicator */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSoundActive(!soundActive);
                        }}
                        className="w-6 h-6 rounded-full bg-[#050810]/80 backdrop-blur-md border border-[#2A3446] flex items-center justify-center text-[#7FA0D6] active:scale-90 transition-transform cursor-pointer"
                      >
                        {soundActive ? (
                          <svg className="w-3 h-3 text-[#7FA0D6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-[#97A0B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6m0-6l6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. AUTOPILOT WORKFLOW: 5-NODE INTERACTIVE STEPPER */}
        <section className="flex flex-col gap-1.5" data-purpose="stepper-workflow">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[9.5px] font-bold tracking-widest uppercase text-[#97A0B3]">CONTINUOUS ENGINE</span>
            <span className="text-[9.5px] font-space-grotesk text-[#97A0B3]">
              Step <span className="text-[#7FA0D6] font-bold">0{activeStep}</span> / 05
            </span>
          </div>
          <h3 className="text-xs font-bold text-[#F8FAFC] px-0.5">How CREO Ships on Autopilot</h3>

          {/* 5-Node Interactive Progress Stepper Bar */}
          <div className="relative py-1 px-1">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#2A3446] -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-4 h-0.5 bg-[#7FA0D6] -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${(activeStep - 1) * 25}%` }}
            />
            <div className="relative z-10 flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => {
                const isActive = activeStep === step;
                const isPast = step < activeStep;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleStepSelect(step)}
                    className={`w-6 h-6 rounded-full font-space-grotesk text-[9px] flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#BCCCE6] text-[#050810] font-bold ring-2 ring-[#7FA0D6]/40"
                        : isPast
                        ? "bg-[#161F2D] text-[#7FA0D6] font-semibold ring-1 ring-[#7FA0D6]/40"
                        : "bg-[#050810] text-[#97A0B3] font-medium ring-1 ring-[#2A3446]"
                    }`}
                  >
                    0{step}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic High-Density Glass Card */}
          <div
            className={`min-h-[64px] rounded-xl border border-[#2A3446] bg-[#161F2D] p-3 flex flex-col justify-center transition-all duration-200 ${
              stepFading ? "opacity-40 translate-y-0.5" : "opacity-100 translate-y-0"
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-[11.5px] font-bold text-[#F8FAFC]">{STEP_DATA[activeStep]?.title}</h4>
              <span className="text-[9px] font-space-grotesk text-[#7FA0D6] bg-[#050810] px-2 py-0.5 rounded border border-[#7FA0D6]/30">
                {STEP_DATA[activeStep]?.tag}
              </span>
            </div>
            <p className="text-[10px] text-[#97A0B3] leading-snug mt-1.5">
              {STEP_DATA[activeStep]?.desc}
            </p>
          </div>
        </section>

        {/* 6. DELIVERABLES PORTAL: DYNAMIC DEVICE FRAME */}
        <section className="flex flex-col gap-1.5" data-purpose="portal-frame" id="deliverables-portal">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[9.5px] font-bold tracking-widest uppercase text-[#97A0B3]">TRY IT — THE PORTAL WORKS</span>
            <span className="text-[9.5px] font-semibold text-[#7FA0D6] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6]" /> Approved +2 days early
            </span>
          </div>

          {/* Tablet Device Frame */}
          <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-2.5 flex flex-col gap-2.5 shadow-sm">
            {/* Top Interactive Deliverable Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#050810] rounded-lg border border-[#2A3446] text-[10px] font-semibold">
              {PORTAL_ITEMS.map((item) => {
                const isSelected = activeBatch === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveBatch(item.id)}
                    className={`py-1.5 rounded transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#161F2D] text-[#7FA0D6] font-bold border border-[#7FA0D6]/40 shadow-sm"
                        : "text-[#97A0B3] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Active Asset Preview Card */}
            <div className="rounded-xl overflow-hidden border border-[#2A3446] bg-[#050810] flex flex-col">
              <div className="relative w-full aspect-[16/9] bg-black/60 overflow-hidden">
                <img
                  src={currentBatchData.img}
                  alt={currentBatchData.title}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  loading="lazy"
                />
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#050810]/85 backdrop-blur-md border border-[#2A3446] text-[9px] font-space-grotesk text-[#F8FAFC]">
                  {PORTAL_ITEMS.find((item) => item.id === activeBatch)?.typeTag || "REEL • 9:16"}
                </div>
                <div
                  className={`absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                    isCurrentBatchApproved
                      ? "bg-[#BCCCE6] text-[#050810] shadow-sm"
                      : "bg-[#161F2D]/90 border border-[#7FA0D6]/40 text-[#7FA0D6]"
                  }`}
                >
                  {isCurrentBatchApproved ? "✓ Approved for Publish" : currentBatchData.status}
                </div>
              </div>

              {/* Asset Metadata & Approval CTA */}
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-[11.5px] font-bold text-[#F8FAFC]">{currentBatchData.title}</h4>
                    <p className="text-[9.5px] text-[#97A0B3]">{currentBatchData.meta}</p>
                  </div>
                  <span className="text-[9.5px] font-space-grotesk text-[#7FA0D6]">V2 (Final)</span>
                </div>

                {/* Split Dual-Button Action Footer */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={handleToggleApprove}
                    className={`h-8 rounded-lg font-bold text-[10.5px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                      isCurrentBatchApproved
                        ? "bg-[#BCCCE6] text-[#050810] shadow-sm"
                        : "bg-[#BCCCE6] text-[#050810] hover:bg-white"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 text-[#050810]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </svg>
                    <span>{isCurrentBatchApproved ? "✓ Approved!" : "✓ Approve"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestChanges}
                    className="h-8 rounded-lg bg-[#161F2D] hover:bg-[#2A3446]/40 border border-[#2A3446] text-[#F8FAFC] text-[10.5px] font-medium flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {changesRequested ? "Note Portal Opened" : "Request Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. PRICING MODULE: DYNAMIC SEGMENTED PRICING CAPSULE */}
        <section className="flex flex-col gap-2" data-purpose="pricing-calculator" id="pricing-section">
          <div className="text-center px-1">
            <span className="text-[9.5px] font-bold tracking-widest uppercase text-[#97A0B3]">
              PREDICTABLE AGENCY INFRASTRUCTURE
            </span>
            <h2 className="text-base font-extrabold text-[#F8FAFC] mt-0.5">
              Transparent pricing that <span className="text-[#7FA0D6]">scales with you</span>
            </h2>
          </div>

          {/* 3-Segment Pill Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#050810] rounded-full border border-[#2A3446] text-[10.5px] font-bold">
            {(["starter", "accelerator", "scale"] as PlanKey[]).map((pKey) => {
              const labels: Record<PlanKey, string> = {
                starter: "Starter",
                accelerator: "Accelerator",
                scale: "Scale Pod",
              };
              const isSelected = activePlan === pKey;
              return (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => setActivePlan(pKey)}
                  className={`py-1.5 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#161F2D] text-[#7FA0D6] border border-[#7FA0D6]/40 shadow-sm font-extrabold"
                      : "text-[#97A0B3] hover:text-[#F8FAFC]"
                  }`}
                >
                  {labels[pKey]}
                </button>
              );
            })}
          </div>

          {/* Unified Glass Pricing Capsule */}
          <div className="relative rounded-2xl border border-[#2A3446] bg-gradient-to-b from-[#161F2D] to-[#0B111C] p-3.5 flex flex-col gap-2.5 shadow-sm overflow-hidden">
            <div className="absolute -right-12 -top-12 w-28 h-28 bg-[#7FA0D6]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-[#050810] text-[#7FA0D6] border border-[#7FA0D6]/30 text-[9px] font-extrabold uppercase tracking-wider">
                  {currentPlan.badge}
                </span>
                <h3 className="text-sm font-extrabold text-[#F8FAFC] mt-0.5">{currentPlan.title}</h3>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-[#F8FAFC] font-space-grotesk">{currentPlan.cost}</span>
                <span className="text-[9px] text-[#97A0B3] block font-normal">/ month flat</span>
              </div>
            </div>

            {/* Deliverable Count Strip */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-space-grotesk text-[10px]">
              <div className="py-1.5 rounded-lg bg-[#050810] border border-[#2A3446] text-[#F8FAFC]">
                <strong className="text-[#7FA0D6]">{currentPlan.reels}</strong> Reels
              </div>
              <div className="py-1.5 rounded-lg bg-[#050810] border border-[#2A3446] text-[#F8FAFC]">
                <strong className="text-[#7FA0D6]">{currentPlan.posters}</strong> Posters
              </div>
              <div className="py-1.5 rounded-lg bg-[#050810] border border-[#2A3446] text-[#F8FAFC]">
                <strong className="text-[#7FA0D6]">{currentPlan.stories}</strong> Stories
              </div>
            </div>

            {/* 2x2 Clean Micro-Grid Features */}
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-[#97A0B3] pt-1.5 border-t border-[#2A3446]">
              {currentPlan.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-[#7FA0D6] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  </svg>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Full Width Glowing Primary Pill CTA */}
            <Link
              to={`/signup?plan=${encodeURIComponent(currentPlan.planParam)}`}
              className="w-full h-10 rounded-xl bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(188,204,230,0.2)] active:scale-[0.98] transition-all mt-0.5 cursor-pointer"
            >
              <span>{currentPlan.cta}</span>
            </Link>
          </div>
        </section>

        {/* 8. INTERACTIVE FAQ CAPSULE */}
        <section className="flex flex-col gap-2" data-purpose="faq-accordion" id="faq-section">
          <div className="px-0.5">
            <span className="text-[9.5px] font-bold tracking-widest uppercase text-[#97A0B3]">GOT QUESTIONS?</span>
            <h3 className="text-sm font-extrabold text-[#F8FAFC]">Common Questions</h3>
          </div>

          <div className="space-y-1.5">
            {[
              {
                q: "How does CREO streamline content creation?",
                a: "CREO replaces email ping-pong. Your pod lead, senior video editor, and designer work asynchronously inside our streamlined portal. You submit raw footage once and receive approved batches every 7 days.",
              },
              {
                q: "What deliverables are included monthly?",
                a: "Based on your tier: 4 to 16 full 9:16 master reels, up to 30 swipe carousels, dynamic story drops, audio sync licenses, and source design files formatted for Meta, TikTok & YouTube Shorts.",
              },
              {
                q: "What happens if a deadline SLA is missed?",
                a: "Our 7-day cadence is strict. If a deliverable drops past the SLA deadline without advance agreement, that entire batch is 100% credited to your account.",
              },
            ].map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "border-[#7FA0D6]/50 bg-[#161F2D]"
                      : "border-[#2A3446] bg-[#161F2D]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-3 text-left flex items-center justify-between gap-2 text-[11.5px] font-semibold text-[#F8FAFC] cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-[#7FA0D6] transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 text-[10.5px] leading-relaxed text-[#97A0B3] border-l-2 border-[#7FA0D6] ml-3 mb-1.5 pl-2.5">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. STREAMLINED "TRY US BEFORE YOU PAY US" MODULE */}
        <section
          className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-3.5 flex flex-col gap-2.5 relative overflow-hidden shadow-sm"
          data-purpose="sample-request"
          id="lead-capture"
        >
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-[#7FA0D6]/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <h3 className="text-sm font-extrabold text-[#F8FAFC]">Try us before you pay us.</h3>
            <p className="text-[10.5px] text-[#97A0B3] mt-0.5">
              Drop your Instagram handle and email. We'll generate a custom sample batch for your brand.
            </p>
          </div>

          {sampleSuccess ? (
            <div className="p-3.5 rounded-xl bg-[#050810] border border-[#7FA0D6]/40 text-center">
              <div className="w-8 h-8 rounded-full bg-[#7FA0D6] text-[#050810] flex items-center justify-center mx-auto mb-1.5 font-bold">
                ✓
              </div>
              <h4 className="text-xs font-bold text-[#F8FAFC]">Sample Batch Requested!</h4>
              <p className="text-[9.5px] text-[#7FA0D6] mt-0.5">
                We received your handle ({sampleHandle}) and email. Our team will prepare your custom batch within 48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSampleSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={sampleHandle}
                  onChange={(e) => setSampleHandle(e.target.value)}
                  placeholder="@brand_handle"
                  required
                  className="w-full h-8 px-2.5 rounded-lg bg-[#050810] border border-[#2A3446] text-[11px] text-[#F8FAFC] placeholder-[#97A0B3]/60 focus:outline-none focus:border-[#7FA0D6] transition-colors"
                />
                <input
                  type="email"
                  value={sampleEmail}
                  onChange={(e) => setSampleEmail(e.target.value)}
                  placeholder="work@brand.com"
                  required
                  className="w-full h-8 px-2.5 rounded-lg bg-[#050810] border border-[#2A3446] text-[11px] text-[#F8FAFC] placeholder-[#97A0B3]/60 focus:outline-none focus:border-[#7FA0D6] transition-colors"
                />
              </div>

              {sampleError && (
                <p className="text-[10px] text-[#D8BF9B] font-semibold">{sampleError}</p>
              )}

              <button
                type="submit"
                disabled={sampleSubmitting}
                className="w-full h-9 rounded-lg bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-[0_4px_16px_rgba(188,204,230,0.2)]"
              >
                {sampleSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#050810]" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Request Instant Sample Batch →</span>
                )}
              </button>
            </form>
          )}

          <p className="text-[9px] text-[#97A0B3] text-center">
            48-hour turn for qualified D2C brands. Zero credit card needed.
          </p>
        </section>

        {/* 10. COMPACT CLOSING BANNER */}
        <section className="p-3.5 rounded-xl border border-[#2A3446] bg-gradient-to-r from-[#161F2D] to-[#0B111C] text-center flex flex-col items-center gap-1.5 shadow-sm">
          <h4 className="text-xs font-black text-[#F8FAFC] leading-tight">
            Stop managing the chaos. <span className="text-[#7FA0D6]">Start operating momentum.</span>
          </h4>
          <p className="text-[9.5px] text-[#97A0B3]">
            Join 50+ modern creative agencies running pod content on autopilot.
          </p>
        </section>
      </main>

      {/* 11. UNIFIED SUPER MOBILE FOOTER */}
      <MobileFooter />
    </div>
  );
}
